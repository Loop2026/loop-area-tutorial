"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Props {
  videoId: string;           // GUID Bunny Stream
  libraryId: string;         // ENV NEXT_PUBLIC_BUNNY_LIBRARY_ID
  moduleId: string;          // 'm1'..'m6'
  userId: string;
  initialPct?: number;
  onDone?: () => void;
}

// Soglia di completamento automatico: se il cliente raggiunge questa
// percentuale di visione consideriamo il modulo "done" anche se non
// arriva l'evento "ended" (alcuni saltano gli ultimi secondi di
// silenzio/credits e cambiano pagina).
const AUTO_DONE_THRESHOLD = 90;

// Heartbeat: ogni N millisecondi salviamo il progresso sul DB
const HEARTBEAT_MS = 10_000;

// Tipi minimi per player.js (caricato via CDN, niente @types da npm)
type PlayerJSInstance = {
  on: (event: string, cb: (data?: { seconds?: number; duration?: number }) => void) => void;
  off?: (event: string) => void;
};
declare global {
  interface Window {
    playerjs?: { Player: new (iframe: HTMLIFrameElement) => PlayerJSInstance };
  }
}

const PLAYERJS_SRC = "https://iframe.mediadelivery.net/player.js";

/**
 * Wrapper Bunny.net Stream con tracking via player.js (la libreria
 * standard ospitata da Bunny stesso). Si registrano gli eventi reali
 * "timeupdate" e "ended" che il player iframe espone — l'approccio
 * precedente basato su postMessage non funzionava perché Bunny non
 * emette nativamente quegli eventi senza player.js.
 *
 * Comportamento:
 * - timeupdate → ogni 10s salva watched_pct in progress + heartbeat in video_views
 * - ended → done=true + completed_at
 * - watched_pct >= 90% → done=true anche se ended non arriva (fallback robusto)
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

  useEffect(() => {
    const sb = createClient();
    let player: PlayerJSInstance | null = null;
    let cancelled = false;

    async function persist(pct: number, done = false) {
      lastPctRef.current = pct;
      lastSentAtRef.current = Date.now();
      try {
        await sb.from("progress").upsert(
          {
            user_id: userId,
            module_id: moduleId,
            watched_pct: Math.min(100, Math.max(0, Math.round(pct))),
            done,
            completed_at: done ? new Date().toISOString() : null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,module_id" }
        );
        await sb.from("video_views").insert({
          user_id: userId,
          module_id: moduleId,
          event_type: done ? "complete" : "heartbeat",
          watched_pct: Math.round(pct),
        });
      } catch (err) {
        // Non blocchiamo il player se il save fallisce — solo log console.
        console.warn("[BunnyPlayer] persist failed", err);
      }
    }

    function markDoneOnce(pct: number) {
      if (doneRef.current) return;
      doneRef.current = true;
      persist(pct, true).then(() => {
        // Re-render server component → la card MarkCompleteButton diventa
        // verde "Modulo completato" e la sidebar/moduli successivi si
        // sbloccano senza ricaricare la pagina.
        router.refresh();
        onDone?.();
      });
    }

    function onPlayerReady() {
      if (!player) return;

      player.on("timeupdate", (data) => {
        if (cancelled || !data || data.duration == null || data.seconds == null) return;
        const pct = (data.seconds / data.duration) * 100;
        lastPctRef.current = pct;

        // Save periodico
        const elapsed = Date.now() - lastSentAtRef.current;
        if (elapsed > HEARTBEAT_MS || pct - lastPctRef.current > 5) {
          persist(pct, false);
        }

        // Auto-done se supera la soglia
        if (pct >= AUTO_DONE_THRESHOLD) {
          markDoneOnce(pct);
        }
      });

      player.on("ended", () => {
        if (cancelled) return;
        markDoneOnce(100);
      });

      player.on("play", () => {
        if (cancelled) return;
        sb.from("video_views")
          .insert({
            user_id: userId,
            module_id: moduleId,
            event_type: "play",
            watched_pct: Math.round(lastPctRef.current),
          })
          .then(() => {});
      });

      player.on("pause", () => {
        if (cancelled) return;
        sb.from("video_views")
          .insert({
            user_id: userId,
            module_id: moduleId,
            event_type: "pause",
            watched_pct: Math.round(lastPctRef.current),
          })
          .then(() => {});
      });
    }

    function initPlayer() {
      if (!iframeRef.current || !window.playerjs || cancelled) return;
      player = new window.playerjs.Player(iframeRef.current);
      player.on("ready", onPlayerReady);
    }

    function loadPlayerJsIfNeeded(cb: () => void) {
      if (window.playerjs) {
        cb();
        return;
      }
      // Riusa script esistente se già caricato
      const existing = document.querySelector(
        `script[src="${PLAYERJS_SRC}"]`
      ) as HTMLScriptElement | null;
      if (existing) {
        if ((existing as HTMLScriptElement & { _loaded?: boolean })._loaded) {
          cb();
        } else {
          existing.addEventListener("load", cb, { once: true });
        }
        return;
      }
      const script = document.createElement("script");
      script.src = PLAYERJS_SRC;
      script.async = true;
      script.addEventListener("load", () => {
        (script as HTMLScriptElement & { _loaded?: boolean })._loaded = true;
        cb();
      });
      script.addEventListener("error", () => {
        console.warn("[BunnyPlayer] failed to load player.js — tracking disabled");
      });
      document.body.appendChild(script);
    }

    loadPlayerJsIfNeeded(initPlayer);

    return () => {
      cancelled = true;
      // player.js non espone destroy esplicito sull'oggetto Player;
      // il garbage collector pulirà i listener postMessage all'unmount.
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
