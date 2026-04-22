"use client";

import { Fragment, useEffect, useState, useCallback } from "react";

interface LogRow {
  id: string;
  created_at: string;
  actor_id: string | null;
  actor_email: string | null;
  actor_role: string | null;
  event_type: string;
  target_type: string | null;
  target_id: string | null;
  target_label: string | null;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
}

const EVENT_OPTIONS: Array<{ value: string; label: string; group: string }> = [
  { value: "", label: "Tutti gli eventi", group: "" },
  { value: "auth.login", label: "Auth · Login", group: "Auth" },
  { value: "auth.logout", label: "Auth · Logout", group: "Auth" },
  { value: "auth.failed", label: "Auth · Login fallito", group: "Auth" },
  { value: "admin.invite", label: "Admin · Invito", group: "Admin" },
  { value: "admin.create", label: "Admin · Creazione", group: "Admin" },
  { value: "admin.disable", label: "Admin · Disabilitato", group: "Admin" },
  { value: "admin.enable", label: "Admin · Riabilitato", group: "Admin" },
  { value: "admin.delete", label: "Admin · Eliminato", group: "Admin" },
  { value: "admin.role_change", label: "Admin · Cambio ruolo", group: "Admin" },
  { value: "client.create", label: "Client · Creazione", group: "Client" },
  { value: "client.update", label: "Client · Modifica", group: "Client" },
  { value: "client.disable", label: "Client · Disabilitato", group: "Client" },
  { value: "client.delete", label: "Client · Eliminato", group: "Client" },
  { value: "module.update", label: "Module · Modifica", group: "Module" },
  { value: "module.publish", label: "Module · Pubblicato", group: "Module" },
];

function eventBadgeClass(type: string): string {
  if (type.startsWith("auth.login")) return "bg-green-100 text-green-800";
  if (type === "auth.logout") return "bg-gray-100 text-gray-700";
  if (type === "auth.failed") return "bg-red-100 text-red-700";
  if (type.startsWith("admin.delete")) return "bg-red-100 text-red-700";
  if (type.startsWith("admin.disable") || type.endsWith(".disable"))
    return "bg-orange-100 text-orange-800";
  if (type.startsWith("admin.")) return "bg-purple-100 text-purple-800";
  if (type.startsWith("client.delete")) return "bg-red-100 text-red-700";
  if (type.startsWith("client.")) return "bg-blue-100 text-blue-800";
  if (type.startsWith("module.")) return "bg-sky-100 text-sky-800";
  return "bg-gray-100 text-gray-700";
}

export function LogsClient() {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [event, setEvent] = useState("");
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (event) params.set("event", event);
    if (q) params.set("q", q);
    if (from) params.set("from", new Date(from).toISOString());
    if (to) params.set("to", new Date(to).toISOString());
    params.set("page", String(page));
    params.set("limit", String(limit));

    try {
      const res = await fetch(`/api/admin/logs?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Errore imprevisto");
        setLogs([]);
        setTotal(0);
      } else {
        setLogs(json.logs as LogRow[]);
        setTotal(json.total as number);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [event, q, from, to, page, limit]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  function resetFilters() {
    setEvent("");
    setQ("");
    setFrom("");
    setTo("");
    setPage(1);
  }

  function onFilterSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  }

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <>
      {/* Filtri */}
      <form
        onSubmit={onFilterSubmit}
        className="card p-4 mb-6 grid grid-cols-1 md:grid-cols-5 gap-3"
      >
        <label className="text-sm md:col-span-1">
          <span className="block text-ink-muted mb-1 text-xs">Evento</span>
          <select
            value={event}
            onChange={(e) => {
              setEvent(e.target.value);
              setPage(1);
            }}
            className="input w-full"
          >
            {EVENT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm md:col-span-2">
          <span className="block text-ink-muted mb-1 text-xs">Cerca (email, target)</span>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Es. mario@example.com"
            className="input w-full"
          />
        </label>
        <label className="text-sm">
          <span className="block text-ink-muted mb-1 text-xs">Dal</span>
          <input
            type="datetime-local"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="input w-full"
          />
        </label>
        <label className="text-sm">
          <span className="block text-ink-muted mb-1 text-xs">Al</span>
          <input
            type="datetime-local"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="input w-full"
          />
        </label>
        <div className="md:col-span-5 flex items-center gap-2">
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Carico…" : "Applica filtri"}
          </button>
          <button
            type="button"
            onClick={resetFilters}
            className="text-sm px-3 py-2 rounded-lg border border-paper-border hover:bg-paper-soft"
          >
            Reset
          </button>
          <span className="text-xs text-ink-muted ml-auto">
            {total.toLocaleString("it-IT")} record
          </span>
        </div>
      </form>

      {error && (
        <div className="mb-4 text-sm p-3 rounded-lg bg-red-50 text-red-800 border border-red-200">
          {error}
        </div>
      )}

      {/* Tabella log */}
      <section className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-paper-soft text-left text-xs uppercase tracking-wider text-ink-muted">
              <tr>
                <th className="px-4 py-3 w-[170px]">Data</th>
                <th className="px-4 py-3 w-[180px]">Evento</th>
                <th className="px-4 py-3">Attore</th>
                <th className="px-4 py-3">Target</th>
                <th className="px-4 py-3 w-[100px]">IP</th>
                <th className="px-4 py-3 w-[40px]"></th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-ink-muted">
                    Nessun log trovato con i filtri attuali.
                  </td>
                </tr>
              )}
              {logs.map((l) => {
                const isOpen = expanded === l.id;
                return (
                  <Fragment key={l.id}>
                    <tr
                      className="border-t border-paper-border hover:bg-paper-soft cursor-pointer"
                      onClick={() => setExpanded(isOpen ? null : l.id)}
                    >
                      <td className="px-4 py-3 text-xs text-ink-muted whitespace-nowrap">
                        {new Date(l.created_at).toLocaleString("it-IT", {
                          dateStyle: "short",
                          timeStyle: "medium",
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-mono ${eventBadgeClass(
                            l.event_type
                          )}`}
                        >
                          {l.event_type}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {l.actor_email ? (
                          <div>
                            <div className="text-ink">{l.actor_email}</div>
                            {l.actor_role && (
                              <div className="text-[11px] text-ink-muted uppercase tracking-wider">
                                {l.actor_role}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-ink-muted italic">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {l.target_label ? (
                          <div>
                            <div className="text-ink">{l.target_label}</div>
                            {l.target_type && (
                              <div className="text-[11px] text-ink-muted uppercase tracking-wider">
                                {l.target_type}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-ink-muted italic">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-ink-muted">
                        {l.ip_address ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-ink-muted">
                        {isOpen ? "▾" : "▸"}
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="bg-paper-soft border-t border-paper-border">
                        <td colSpan={6} className="px-4 py-4">
                          <dl className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                            <div>
                              <dt className="text-ink-muted uppercase tracking-wider">Log ID</dt>
                              <dd className="font-mono text-ink break-all">{l.id}</dd>
                            </div>
                            <div>
                              <dt className="text-ink-muted uppercase tracking-wider">Actor ID</dt>
                              <dd className="font-mono text-ink break-all">
                                {l.actor_id ?? "—"}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-ink-muted uppercase tracking-wider">Target ID</dt>
                              <dd className="font-mono text-ink break-all">
                                {l.target_id ?? "—"}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-ink-muted uppercase tracking-wider">
                                User agent
                              </dt>
                              <dd className="text-ink break-all">{l.user_agent ?? "—"}</dd>
                            </div>
                            <div className="md:col-span-2">
                              <dt className="text-ink-muted uppercase tracking-wider">
                                Metadata
                              </dt>
                              <dd>
                                <pre className="bg-white border border-paper-border rounded-md p-3 text-[11px] font-mono overflow-x-auto text-ink">
                                  {JSON.stringify(l.metadata ?? {}, null, 2)}
                                </pre>
                              </dd>
                            </div>
                          </dl>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Paginazione */}
        {total > limit && (
          <footer className="px-4 py-3 border-t border-paper-border flex items-center justify-between text-sm">
            <span className="text-ink-muted">
              Pagina {page} di {totalPages}
            </span>
            <div className="inline-flex gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className="px-3 py-1 rounded-md border border-paper-border hover:bg-paper-soft disabled:opacity-50"
              >
                ← Precedente
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loading}
                className="px-3 py-1 rounded-md border border-paper-border hover:bg-paper-soft disabled:opacity-50"
              >
                Successiva →
              </button>
            </div>
          </footer>
        )}
      </section>
    </>
  );
}
