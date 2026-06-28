"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// player.js dal pacchetto npm — niente CDN esterni
// @ts-expect-error — player.js non ha @types pubblicati
import playerjs from "player.js";

interface Props {
  videoId: string;
  libraryId: string;
  moduleId: string;
  userId: string;
  initialPct?: number;
  onDone?: () => void;
}

// Tipi minimi di player.js
type PlayerJSEventData = { seconds?: number; duration?: number } | undefined;
type PlayerJSInstance = {
  on: (event: string, cb: (data?: PlayerJSEventData) => void) => void;
};

const AUTO_DONE_THRESHOLD = 90;        // % → marca done anche senza evento "ended"
const HEARTBEAT_MS = 10_000;           // intervallo di persist su DB
const PLAY_PAUSE_DEDUP_MS = 800;       // ignora play/pause ripetuti entro questo intervallo

const LOG = "[BunnyPlayer]";

/**
 * Wrapper Bunny.net Stream + tracking via player.js (npm).
 * Eventi gestiti:
 *  - play / pause → log su video_views (dedup entro 800ms per evitare doppi eventi)
 *  - timeupdate → heartbeat ogni 10s su progress + video_views
 *  - seeked → se l'utente trascina oltre la soglia di auto-done, marca done
 *  - ended → done=true + completed_at
 *  - watched_pct >= 90% → done=true (fallback per chi salta credits/silenzio finale)
 *
 * Dopo aver marcato done si chiama router.refresh(): la card sotto il player
 * diventa "Modulo completato" e la sidebar sblocca il modulo successivo,
 * senza che l'utente debba ricaricare manualmente la pagina.
 */
export function BunnyPlayer({
  videoId,
  libraryId,
  moduleId,
  userId,
  initialPct = 0,
  onDone,
}: Props) {
  const router = useRouter();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const lastPctRef = useRef<number>(initialPct);
  const lastSentAtRef = useRef<number>(0);
  const doneRef = useRef<boolean>(false);
  const lastPlayPauseAtRef = useRef<{ play: number; pause: number }>({ play: 0, pause: 0 });
  const initializedRef = useRef<boolean>(false);

  useEffect(() => {
    if (initializedRef.current) return; // guard anti double-init
    initializedRef.current = true;
    if (!iframeRef.current) return;

    const sb = createClient();
    let cancelled = false;
    let player: PlayerJSInstance | null = null;

    async function persist(pct: number, done = false) {
      // Una volta marcato done, ignora tutti i persist(false) successivi:
      // l'upsert sovrascriverebbe done=true tornandolo a false e il
      // modulo successivo resterebbe bloccato. Il done resta "sticky".
      if (!done && doneRef.current) return;

      lastPctRef.current = pct;
      lastSentAtRef.current = Date.now();
      const watched = Math.min(100, Math.max(0, Math.round(pct)));

      // Costruisci payload preservando done=true se già impostato
      const payload: Record<string, unknown> = {
        user_id: userId,
        module_id: moduleId,
        watched_pct: watched,
        done: done || doneRef.current,
        updated_at: new Date().toISOString(),
      };
      if (done || doneRef.current) {
        payload.completed_at = new Date().toISOString();
      }

      const { error: e1 } = await sb.from("progress").upsert(payload, {
        onConflict: "user_id,module_id",
      });
      if (e1) console.warn(LOG, "progress upsert error:", e1.message);

      const { error: e2 } = await sb.from("video_views").insert({
        user_id: userId,
        module_id: moduleId,
        event_type: done ? "complete" : "heartbeat",
        watched_pct: watched,
      });
      if (e2) console.warn(LOG, "video_views insert error:", e2.message);
    }

    function markDoneOnce(pct: number) {
      if (doneRef.current) return;
      doneRef.current = true;
      persist(pct, true).then(() => {
        router.refresh();
        onDone?.();
      });
    }

    function logPlayPause(type: "play" | "pause") {
      const now = Date.now();
      if (now - lastPlayPauseAtRef.current[type] < PLAY_PAUSE_DEDUP_MS) return;
      lastPlayPauseAtRef.current[type] = now;
      sb.from("video_views")
        .insert({
          user_id: userId,
          module_id: moduleId,
          event_type: type,
          watched_pct: Math.round(lastPctRef.current),
        })
        .then(({ error }) => {
          if (error) console.warn(LOG, type, "insert error:", error.message);
        });
    }

    try {
      const Ctor = (playerjs as { Player: new (el: HTMLIFrameElement) => PlayerJSInstance }).Player;
      player = new Ctor(iframeRef.current);

      player.on("ready", () => {
        if (cancelled || !player) return;

        player.on("timeupdate", (data) => {
          if (cancelled || !data || data.duration == null || data.seconds == null) return;
          const pct = (data.seconds / data.duration) * 100;
          const prevPct = lastPctRef.current;
          lastPctRef.current = pct;

          // Persist periodico
          const elapsed = Date.now() - lastSentAtRef.current;
          if (elapsed > HEARTBEAT_MS || pct - prevPct > 5) {
            persist(pct, false);
          }
          // Auto-done sopra soglia
          if (pct >= AUTO_DONE_THRESHOLD) {
            markDoneOnce(pct);
          }
        });

        // Se trascina la barra oltre il 90% senza far scorrere il tempo
        player.on("seeked", (data) => {
          if (cancelled || !data || data.duration == null || data.seconds == null) return;
          const pct = (data.seconds / data.duration) * 100;
          lastPctRef.current = pct;
          if (pct >= AUTO_DONE_THRESHOLD) {
            markDoneOnce(pct);
          }
        });

        player.on("ended", () => {
          if (cancelled) return;
          markDoneOnce(100);
        });

        player.on("play",  () => { if (!cancelled) logPlayPause("play"); });
        player.on("pause", () => { if (!cancelled) logPlayPause("pause"); });
      });
    } catch (err) {
      console.error(LOG, "init failed:", err);
    }

    return () => {
      cancelled = true;
      // player.js non espone destroy() — il garbage collector pulisce i postMessage handler
    };
  }, [moduleId, userId, onDone, router]);

  const src = `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}?autoplay=false&loop=false&muted=false&preload=true&responsive=true`;

  return (
    <div
      className="relative w-full rounded-2xl overflow-hidden bg-black shadow-card"
      style={{ aspectRatio: "16/9" }}
    >
      <iframe
        ref={iframeRef}
        src={src}
        loading="lazy"
        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
        className="absolute inset-0 w-full h-full border-0"
        title={`LOOP — modulo ${moduleId}`}
      />
    </div>
  );
}
