"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface Props {
  moduleId: string;
  initialDone: boolean;
  nextModuleTitle?: string | null;
}

/**
 * CTA manuale per marcare il modulo come completato.
 * Quick fix in attesa che il tracking automatico Bunny venga sistemato
 * (vedi BunnyPlayer.tsx — gli eventi postMessage di default non arrivano).
 */
export function MarkCompleteButton({
  moduleId,
  initialDone,
  nextModuleTitle,
}: Props) {
  const router = useRouter();
  const [done, setDone] = useState(initialDone);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function markComplete() {
    setError(null);
    startTransition(async () => {
      const r = await fetch("/api/progress/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleId, watchedPct: 100, done: true }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(j.error ?? "Errore nel salvataggio. Riprova.");
        return;
      }
      setDone(true);
      // Refresh per rivalutare lo stato dei moduli (sblocca quello successivo)
      router.refresh();
    });
  }

  if (done) {
    return (
      <div className="mt-5 rounded-2xl bg-green-50 border border-green-200 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center font-bold">
            ✓
          </span>
          <div>
            <div className="font-semibold text-green-900">Modulo completato</div>
            <div className="text-xs text-green-800/80">
              {nextModuleTitle
                ? `Il modulo successivo "${nextModuleTitle}" è sbloccato.`
                : "Hai completato l'intero percorso. Bravo!"}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-5 rounded-2xl bg-paper-soft border border-paper-border p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <div className="font-semibold text-ink mb-1">
          Hai finito di guardare il video?
        </div>
        <div className="text-xs text-ink-muted">
          Conferma per registrare il completamento e sbloccare il modulo successivo.
        </div>
        {error && (
          <div className="mt-2 text-xs text-red-700 font-semibold">{error}</div>
        )}
      </div>
      <button
        type="button"
        onClick={markComplete}
        disabled={pending}
        className="btn-primary px-5 py-3 text-sm font-semibold whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {pending ? "Salvo…" : "✓ Segna come completato"}
      </button>
    </div>
  );
}
