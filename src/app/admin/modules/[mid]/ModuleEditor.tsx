"use client";

import { useState, useTransition, useRef } from "react";
import type { ModuleRow, Chapter, ResourceLink } from "@/lib/types";

interface Props {
  module: ModuleRow;
}

export function ModuleEditor({ module: initialMod }: Props) {
  const [bunnyId, setBunnyId] = useState(initialMod.bunny_video_id ?? "");
  const [published, setPublished] = useState(initialMod.published);
  const [chapters, setChapters] = useState<Chapter[]>(
    Array.isArray(initialMod.chapters) ? initialMod.chapters : []
  );
  const [resources, setResources] = useState<ResourceLink[]>(
    Array.isArray(initialMod.resources) ? initialMod.resources : []
  );
  const [pending, startTransition] = useTransition();
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function addChapter() {
    setChapters([...chapters, { time: 0, title: "" }]);
  }
  function updateChapter(i: number, patch: Partial<Chapter>) {
    setChapters(chapters.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  }
  function removeChapter(i: number) {
    setChapters(chapters.filter((_, idx) => idx !== i));
  }

  function addLink() {
    setResources([
      ...resources,
      { type: "link", title: "", url: "" },
    ]);
  }
  function updateRes(i: number, patch: Partial<ResourceLink>) {
    setResources(
      resources.map((r, idx) => (idx === i ? { ...r, ...patch } : r))
    );
  }
  function removeRes(i: number) {
    setResources(resources.filter((_, idx) => idx !== i));
  }

  async function uploadFile(file: File) {
    setError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", initialMod.id);
      const r = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const j = await r.json();
      if (!r.ok) {
        setError(j.error ?? "Upload fallito");
        return;
      }
      const ext = (j.name?.split(".").pop() ?? "").toLowerCase();
      const type: ResourceLink["type"] =
        ext === "pdf" ? "pdf" : ext === "xlsx" || ext === "xls" ? "xlsx" : "link";
      setResources([
        ...resources,
        { type, title: j.name, url: j.url },
      ]);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function save() {
    setError(null);
    setSavedAt(null);
    startTransition(async () => {
      // pulisco capitoli vuoti
      const cleanChapters = chapters
        .filter((c) => c.title.trim())
        .map((c) => ({
          time: Number(c.time) || 0,
          title: c.title.trim(),
        }));
      const cleanResources = resources
        .filter((r) => r.title.trim() && r.url.trim())
        .map((r) => ({
          type: r.type,
          title: r.title.trim(),
          url: r.url.trim(),
        }));

      const r = await fetch(`/api/admin/modules/${initialMod.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bunny_video_id: bunnyId.trim() || null,
          published,
          chapters: cleanChapters,
          resources: cleanResources,
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(j.error ?? "Errore");
        return;
      }
      setChapters(cleanChapters);
      setResources(cleanResources);
      setSavedAt(new Date().toLocaleTimeString("it-IT"));
    });
  }

  return (
    <div className="space-y-6">
      {/* Status bar */}
      <div className="a-panel">
        <div className="a-panel-h">
          <h2>Pubblicazione</h2>
          <span className="meta">
            {published ? "Visibile ai clienti" : "Nascosto ai clienti"}
          </span>
        </div>
        <div className="a-panel-b flex items-center gap-4 flex-wrap">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
              className="w-5 h-5 accent-[var(--blue-m)]"
            />
            <span className="text-sm font-semibold text-[var(--ink)]">
              Modulo pubblicato
            </span>
          </label>
          <span className="text-xs text-[var(--ink-slate)]">
            Disabilita per nascondere il modulo dall&apos;Area Tutorial.
          </span>
        </div>
      </div>

      {/* Video */}
      <div className="a-panel">
        <div className="a-panel-h">
          <h2>Video Bunny.net</h2>
          <span className="meta">
            {bunnyId ? "Configurato" : "Da configurare"}
          </span>
        </div>
        <div className="a-panel-b space-y-3">
          <div>
            <label className="a-label">Bunny Video ID</label>
            <input
              type="text"
              className="a-field font-mono"
              value={bunnyId}
              onChange={(e) => setBunnyId(e.target.value)}
              placeholder="es. 8a3b1c4d-9876-..."
            />
            <p className="text-xs text-[var(--ink-slate)] mt-2">
              Lo trovi nel pannello Bunny.net Stream → tuo video → &ldquo;Direct
              Play URL&rdquo; o &ldquo;Embed&rdquo;. Incolla qui solo l&apos;ID
              (la stringa GUID), non l&apos;URL completo.
            </p>
          </div>
          <details className="text-sm">
            <summary className="cursor-pointer text-[var(--blue-m)] font-semibold">
              Come trovare il Bunny Video ID
            </summary>
            <ol className="mt-3 space-y-1 text-[var(--ink-slate)] list-decimal pl-5">
              <li>
                Vai su Bunny.net → Stream → la tua Library → carica/seleziona
                il video.
              </li>
              <li>
                Apri il video, copia il valore <code>videoId</code> mostrato
                nei dettagli (formato GUID con trattini).
              </li>
              <li>
                Verifica che le 3 env var siano settate su Vercel:{" "}
                <code>NEXT_PUBLIC_BUNNY_LIBRARY_ID</code>,{" "}
                <code>NEXT_PUBLIC_BUNNY_CDN_HOSTNAME</code>,{" "}
                <code>BUNNY_STREAM_API_KEY</code>.
              </li>
            </ol>
          </details>
        </div>
      </div>

      {/* Chapters */}
      <div className="a-panel">
        <div className="a-panel-h">
          <h2>Capitoli</h2>
          <span className="meta">{chapters.length}</span>
        </div>
        <div className="a-panel-b space-y-3">
          {chapters.length === 0 && (
            <p className="text-sm text-[var(--ink-slate)]">
              Nessun capitolo. I capitoli aiutano i clienti a navigare il
              video; sono opzionali.
            </p>
          )}
          {chapters.map((c, i) => (
            <div
              key={i}
              className="grid grid-cols-[110px_1fr_auto] gap-3 items-center"
            >
              <input
                type="number"
                min={0}
                step={1}
                className="a-field font-mono text-sm"
                value={c.time}
                onChange={(e) =>
                  updateChapter(i, { time: Number(e.target.value) })
                }
                placeholder="sec."
              />
              <input
                type="text"
                className="a-field text-sm"
                value={c.title}
                onChange={(e) =>
                  updateChapter(i, { title: e.target.value })
                }
                placeholder="Titolo capitolo"
              />
              <button
                type="button"
                className="a-btn a-btn-danger text-xs"
                onClick={() => removeChapter(i)}
              >
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            className="a-btn a-btn-ghost text-sm"
            onClick={addChapter}
          >
            + Aggiungi capitolo
          </button>
          <p className="text-xs text-[var(--ink-slate)]">
            Il tempo è in secondi (es. 90 = 1:30).
          </p>
        </div>
      </div>

      {/* Resources */}
      <div className="a-panel">
        <div className="a-panel-h">
          <h2>Risorse / documenti</h2>
          <span className="meta">{resources.length}</span>
        </div>
        <div className="a-panel-b space-y-4">
          {/* Upload area */}
          <div>
            <label className="a-label">Carica un nuovo file</label>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.xlsx,.xls,.docx,.png,.jpg,.jpeg,.zip"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadFile(f);
              }}
              disabled={uploading}
              className="a-field text-sm"
            />
            {uploading && (
              <p className="text-xs text-[var(--blue-m)] mt-2">
                Caricamento in corso…
              </p>
            )}
            <p className="text-xs text-[var(--ink-slate)] mt-2">
              Max 100 MB. Formati: PDF, XLSX, DOCX, PNG, JPG, ZIP. I file
              caricati vengono ospitati sul bucket Storage di Supabase.
            </p>
          </div>

          {/* Resource list */}
          {resources.length > 0 && (
            <ul className="space-y-2">
              {resources.map((r, i) => (
                <li key={i} className="a-resource-row">
                  <div className="icon">{r.type.toUpperCase()}</div>
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                    <input
                      type="text"
                      className="a-field text-sm"
                      value={r.title}
                      onChange={(e) =>
                        updateRes(i, { title: e.target.value })
                      }
                      placeholder="Titolo visibile al cliente"
                    />
                    <div className="flex gap-2">
                      <select
                        className="a-field text-sm"
                        value={r.type}
                        onChange={(e) =>
                          updateRes(i, {
                            type: e.target.value as ResourceLink["type"],
                          })
                        }
                        style={{ width: 100 }}
                      >
                        <option value="pdf">PDF</option>
                        <option value="xlsx">XLSX</option>
                        <option value="link">Link</option>
                        <option value="checklist">Checklist</option>
                      </select>
                      <input
                        type="url"
                        className="a-field text-sm font-mono"
                        value={r.url}
                        onChange={(e) =>
                          updateRes(i, { url: e.target.value })
                        }
                        placeholder="https://…"
                      />
                    </div>
                  </div>
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener"
                    className="a-btn a-btn-ghost text-xs"
                    title="Apri"
                  >
                    ↗
                  </a>
                  <button
                    type="button"
                    className="a-btn a-btn-danger text-xs"
                    onClick={() => removeRes(i)}
                    title="Rimuovi"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            className="a-btn a-btn-ghost text-sm"
            onClick={addLink}
          >
            + Aggiungi link esterno
          </button>
        </div>
      </div>

      {/* Save bar */}
      <div className="sticky bottom-4 z-10">
        <div className="a-panel a-panel-b flex items-center justify-between gap-4 flex-wrap shadow-lg">
          <div className="text-sm text-[var(--ink-slate)]">
            {error ? (
              <span className="text-red-700">⚠ {error}</span>
            ) : savedAt ? (
              <span className="text-emerald-700">
                ✓ Salvato alle {savedAt}
              </span>
            ) : (
              <>Modifiche non salvate</>
            )}
          </div>
          <button
            type="button"
            className="a-btn a-btn-primary"
            disabled={pending || uploading}
            onClick={save}
          >
            {pending ? "Salvataggio…" : "💾 Salva modulo"}
          </button>
        </div>
      </div>
    </div>
  );
}
