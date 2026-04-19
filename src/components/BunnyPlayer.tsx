"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  videoId: string;           // GUID Bunny Stream
  libraryId: string;         // ENV NEXT_PUBLIC_BUNNY_LIBRARY_ID
  moduleId: string;          // 'm1'..'m6'
  userId: string;
  initialPct?: number;
  onDone?: () => void;
}

/**
 * Wrapper Bunny.net Stream iframe + postMessage tracking.
 * Bunny emette eventi postMessage (ready/play/pause/timeupdate/ended) sul player embed.
 * Qui: heartbeat ogni 10s e on 'ended' segniamo completato.
 */
export function BunnyPlayer({
  videoId,
  libraryId,
  moduleId,
  userId,
  initialPct = 0,
  onDone
}: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const lastPctRef = useRef<number>(initialPct);
  const lastSentAtRef = useRef<number>(0);

  useEffect(() => {
    const sb = createClient();

    async function persist(pct: number, done = false) {
      lastPctRef.current = pct;
      lastSentAtRef.current = Date.now();
      await sb.from("progress").upsert({
        user_id: userId,
        module_id: moduleId,
        watched_pct: Math.min(100, Math.max(0, Math.round(pct))),
        done,
        completed_at: done ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      });
      await sb.from("video_views").insert({
        user_id: userId,
        module_id: moduleId,
        event_type: done ? "complete" : "heartbeat",
        watched_pct: Math.round(pct)
      });
    }

    function onMessage(ev: MessageEvent) {
      if (!ev.data || typeof ev.data !== "object") return;
      const { event, seconds, duration } = ev.data as {
        event?: string;
        seconds?: number;
        duration?: number;
      };
      if (!event) return;

      if (event === "timeupdate" && duration && seconds != null) {
        const pct = (seconds / duration) * 100;
        // Persisti ogni 10s o se delta > 5%
        const elapsed = Date.now() - lastSentAtRef.current;
        if (elapsed > 10000 || pct - lastPctRef.current > 5) {
          persist(pct).catch(() => {});
        }
      } else if (event === "ended") {
        persist(100, true).then(() => onDone?.()).catch(() => {});
      } else if (event === "play" || event === "pause") {
        sb.from("video_views").insert({
          user_id: userId,
          module_id: moduleId,
          event_type: event,
          watched_pct: Math.round(lastPctRef.current)
        });
      }
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [moduleId, userId, onDone]);

  const src = `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}?autoplay=false&loop=false&muted=false&preload=true&responsive=true`;

  return (
    <div className="relative w-full rounded-2xl overflow-hidden bg-black shadow-card" style={{ aspectRatio: "16/9" }}>
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
