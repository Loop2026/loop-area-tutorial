"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ChecklistItem, UserChecklistRow } from "@/lib/types";

interface Props {
  items: ChecklistItem[];
  userChecklist: UserChecklistRow[];
  userId: string;
}

export function Checklist({ items, userChecklist, userId }: Props) {
  const [map, setMap] = useState<Record<string, boolean>>(
    Object.fromEntries(userChecklist.map((r) => [r.item_id, r.done]))
  );
  const [pending, startTransition] = useTransition();

  function toggle(itemId: string) {
    const next = !map[itemId];
    setMap((m) => ({ ...m, [itemId]: next }));
    startTransition(async () => {
      const sb = createClient();
      await sb.from("user_checklist").upsert({
        user_id: userId,
        item_id: itemId,
        done: next,
        completed_at: next ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      });
    });
  }

  const doneCount = Object.values(map).filter(Boolean).length;

  return (
    <section id="checklist" className="card p-6">
      <header className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-bold text-ink text-lg">Checklist onboarding</h2>
          <p className="text-sm text-ink-muted">
            Completa i 5 passaggi per essere operativo.
          </p>
        </div>
        <div className="text-sm font-semibold text-blue-m">
          {doneCount}/{items.length}
        </div>
      </header>

      <ul className="space-y-2">
        {items
          .slice()
          .sort((a, b) => a.order_index - b.order_index)
          .map((it) => {
            const checked = !!map[it.id];
            return (
              <li key={it.id}>
                <button
                  type="button"
                  onClick={() => toggle(it.id)}
                  disabled={pending}
                  className={[
                    "w-full flex items-start gap-3 p-3 rounded-xl border transition text-left",
                    checked
                      ? "bg-green-50 border-green-200"
                      : "bg-white border-paper-border hover:border-blue-l/50"
                  ].join(" ")}
                >
                  <span
                    className={[
                      "mt-0.5 w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 border-2 transition",
                      checked ? "bg-green-500 border-green-500 text-white" : "border-slate-300"
                    ].join(" ")}
                    aria-hidden
                  >
                    {checked && (
                      <svg
                        className="w-3 h-3"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                      >
                        <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                  <div className="min-w-0">
                    <div className={`font-semibold ${checked ? "line-through text-ink-muted" : "text-ink"}`}>
                      {it.title}
                    </div>
                    <div className="text-xs text-ink-muted mt-0.5">{it.subtitle}</div>
                  </div>
                </button>
              </li>
            );
          })}
      </ul>
    </section>
  );
}
