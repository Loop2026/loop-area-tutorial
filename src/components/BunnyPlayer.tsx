"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Importa la libreria player.js da npm (più affidabile del CDN esterno).
// player.js non ha @types ufficiali — dichiariamo l'interfaccia che usiamo.
// @ts-expect-error — player.js non ha types
import playerjs from "player.js";

interface Props {
  videoId: string;
  libraryId: string;
  moduleId: string;
  userId: string;
  initialPct?: number;
  onDone?: () => void;
}

// Tipi minimi di player.js sufficienti per i nostri usi
type PlayerJSInstance = {
  on: (event: string, cb: (data?: { seconds?: number; duration?: number }) => void) => void;
};

const AUTO_DONE_THRESHOLD = 90; // % → marca done anche senza evento "ended"
const HEARTBEAT_MS = 10_000;
const LOG_PREFIX = "[BunnyPlayer]";

/**
 * Wrapper Bunny.net Stream con tracking via player.js (npm).
 * Il player Bunny iframe supporta nativamente player.js — basta inizializzare
 * `new playerjs.Player(iframe)` e ascoltare gli eventi.
 *
 * Log diagnostici lasciati a video per debug: aprendo la console del browser
 * si vedono i passaggi di init e gli eventi. Una volta verificato che tutto
 * funziona, si possono rimuovere.
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
    let cancelled = false;
    let player: PlayerJSInstance | null = null;

    async function persist(pct: number, done = false) {
      lastPctRef.current = pct;
      lastSentAtRef.current = Date.now();
      try {
        const { error: e1 } = await sb.from("progress").upsert(
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
        if (e1) console.warn(LOG_PREFIX, "progress upsert error", e1.message);

        const { error: e2 } = await sb.from("video_views").insert({
          user_id: userId,
          module_id: moduleId,
          event_type: done ? "complete" : "heartbeat",
          watched_pct: Math.round(pct),
        });
        if (e2) console.warn(LOG_PREFIX, "video_views insert error", e2.message);

        if (!e1 && !e2) {
          console.log(LOG_PREFIX, "persist OK", { pct: Math.round(pct), done });
        }
      } catch (err) {
        console.warn(LOG_PREFIX, "persist exception", err);
      }
    }

    function markDoneOnce(pct: number) {
      if (doneRef.current) return;
      doneRef.current = true;
      console.log(LOG_PREFIX, "DONE reached at", Math.round(pct), "%");
      persist(pct, true).then(() => {
        router.refresh();
        onDone?.();
      });
    }

    function init() {
      if (cancelled || !iframeRef.current) return;
      try {
        // Costruisce il player usando l'iframe element
        // (player.js accetta sia un elemento DOM sia un id stringa)
        const p = new (playerjs as { Player: new (el: HTMLIFrameElement) => PlayerJSInstance }).Player(iframeRef.current);
        player = p;
        console.log(LOG_PREFIX, "player.js inizializzato — aspetto ready");

        p.on("ready", () => {
          console.log(LOG_PREFIX, "✓ player ready — registro listener");

          p.on("timeupdate", (data) => {
            if (cancelled || !data || data.duration == null || data.seconds == null) return;
            const pct = (data.seconds / data.duration) * 100;
            const prevPct = lastPctRef.current;
            lastPctRef.current = pct;

            const elapsed = Date.now() - lastSentAtRef.current;
            if (elapsed > HEARTBEAT_MS || pct - prevPct > 5) {
              persist(pct, false);
            }
            if (pct >= AUTO_DONE_THRESHOLD) {
              markDoneOnce(pct);
            }
          });

          p.on("ended", () => {
            if (cancelled) return;
            console.log(LOG_PREFIX, "evento 'ended' ricevuto");
            markDoneOnce(100);
          });

          p.on("play", () => {
            if (cancelled) return;
            console.log(LOG_PREFIX, "play");
            sb.from("video_views").insert({
              user_id: userId,
              module_id: moduleId,
              event_type: "play",
              watched_pct: Math.round(lastPctRef.current),
            }).then(() => {});
          });

          p.on("pause", () => {
            if (cancelled) return;
            console.log(LOG_PREFIX, "pause");
            sb.from("video_views").insert({
              user_id: userId,
              module_id: moduleId,
              event_type: "pause",
              watched_pct: Math.round(lastPctRef.current),
            }).then(() => {});
          });
        });
      } catch (err) {
        console.error(LOG_PREFIX, "init exception", err);
      }
    }

    // L'iframe deve essere già montato — siamo dentro useEffect, lo è.
    // Dialoga in postMessage, quindi può partire subito.
    init();

    return () => {
      cancelled = true;
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
