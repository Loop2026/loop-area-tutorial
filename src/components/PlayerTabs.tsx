"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Chapter, ResourceLink } from "@/lib/types";

interface Props {
  chapters: Chapter[];
  resources: ResourceLink[];
  initialNotes: string;
  userId: string;
  moduleId: string;
}

export function PlayerTabs({ chapters, resources, initialNotes, userId, moduleId }: Props) {
  const [tab, setTab] = useState<"chapters" | "notes" | "resources">("chapters");
  const [notes, setNotes] = useState(initialNotes);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function saveNotes() {
    startTransition(async () => {
      const sb = createClient();
      await sb.from("progress").upsert({
        user_id: userId,
        module_id: moduleId,
        notes,
        updated_at: new Date().toISOString()
      }, { onConflict: "user_id,module_id" });
      setSavedAt(new Date().toLocaleTimeString("it-IT"));
    });
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex border-b border-paper-border bg-paper-soft">
        <TabBtn id="chapters" tab={tab} setTab={setTab}>Capitoli</TabBtn>
        <TabBtn id="notes" tab={tab} setTab={setTab}>Note</TabBtn>
        <TabBtn id="resources" tab={tab} setTab={setTab}>Risorse</TabBtn>
      </div>

      {tab === "chapters" && (
        <ul className="p-4 space-y-2">
          {chapters.length === 0 && (
            <li className="text-sm text-ink-muted p-2">Nessun capitolo disponibile.</li>
          )}
          {chapters.map((c, i) => (
            <li key={i} className="flex items-start gap-3 p-3 rounded-xl hover:bg-paper-soft">
              <span className="text-xs font-mono text-blue-m font-semibold mt-0.5">
                {fmtTime(c.time)}
              </span>
              <span className="text-sm text-ink">{c.title}</span>
            </li>
          ))}
        </ul>
      )}

      {tab === "notes" && (
        <div className="p-4">
          <textarea
            className="field min-h-[180px] font-sans resize-y"
            placeholder="Prendi appunti durante il video…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-ink-muted">
              {savedAt ? `Salvato alle ${savedAt}` : "Non salvate"}
            </span>
            <button className="btn-primary" onClick={saveNotes} disabled={pending}>
              {pending ? "Salvataggio…" : "Salva note"}
            </button>
          </div>
        </div>
      )}

      {tab === "resources" && (
        <ul className="p-4 space-y-2">
          {resources.length === 0 && (
            <li className="text-sm text-ink-muted p-2">Nessuna risorsa allegata.</li>
          )}
          {resources.map((r, i) => (
            <li key={i}>
              <a
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-xl border border-paper-border hover:border-blue-l/60 hover:bg-paper-soft transition"
              >
                <span className="w-10 h-10 rounded-lg bg-blue-50 text-blue-m flex items-center justify-center text-xs font-bold uppercase">
                  {r.type}
                </span>
                <span className="text-sm font-medium text-ink">{r.title}</span>
                <span className="ml-auto text-ink-muted" aria-hidden>↗</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TabBtn({
  id, tab, setTab, children
}: {
  id: "chapters" | "notes" | "resources";
  tab: string;
  setTab: (t: any) => void;
  children: React.ReactNode;
}) {
  const active = tab === id;
  return (
    <button
      type="button"
      onClick={() => setTab(id)}
      className={[
        "flex-1 py-3 text-sm font-semibold transition",
        active ? "text-blue-m border-b-2 border-blue-m bg-white" : "text-ink-muted hover:text-ink"
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function fmtTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}
