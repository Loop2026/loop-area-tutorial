"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AdminRow } from "./page";

interface Props {
  initialAdmins: AdminRow[];
  currentUserId: string;
}

type Mode = "invite" | "create";

export function AdminsClient({ initialAdmins, currentUserId }: Props) {
  const router = useRouter();
  const [admins, setAdmins] = useState<AdminRow[]>(initialAdmins);
  const [mode, setMode] = useState<Mode>("invite");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<
    | { kind: "ok"; text: string }
    | { kind: "err"; text: string }
    | null
  >(null);

  async function submitNew(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);

    startTransition(async () => {
      const res = await fetch("/api/admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          email: email.trim(),
          password: password.trim(),
          fullName: fullName.trim(),
        }),
      });
      const json = await res.json();

      if (!res.ok) {
        setFeedback({ kind: "err", text: json.error ?? "Errore imprevisto" });
        return;
      }

      if (mode === "invite") {
        setFeedback({
          kind: "ok",
          text: `Invito inviato a ${email}. Al primo accesso sarà admin.`,
        });
      } else {
        setFeedback({
          kind: "ok",
          text: `Admin creato: ${email}. Comunicagli la password che hai impostato.`,
        });
      }

      setEmail("");
      setFullName("");
      setPassword("");
      router.refresh();
    });
  }

  async function runAction(
    id: string,
    action: "disable" | "enable" | "demote" | "delete",
    label: string
  ) {
    if (id === currentUserId) {
      setFeedback({ kind: "err", text: "Non puoi modificare il tuo account da qui." });
      return;
    }

    const messages: Record<string, string> = {
      disable: `Disabilitare ${label}? Non potrà più accedere.`,
      enable: `Riabilitare ${label}?`,
      demote: `Rimuovere il ruolo admin a ${label}? Diventerà un utente normale.`,
      delete: `Eliminare definitivamente ${label}? Questa operazione è irreversibile.`,
    };
    if (!confirm(messages[action])) return;

    setFeedback(null);
    startTransition(async () => {
      const res = await fetch(`/api/admin/admins/${id}`, {
        method: action === "delete" ? "DELETE" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: action === "delete" ? undefined : JSON.stringify({ action }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFeedback({ kind: "err", text: json.error ?? "Errore imprevisto" });
        return;
      }

      if (action === "delete" || action === "demote") {
        setAdmins((prev) => prev.filter((a) => a.id !== id));
      } else {
        setAdmins((prev) =>
          prev.map((a) =>
            a.id === id ? { ...a, status: action === "disable" ? "disabled" : "active" } : a
          )
        );
      }

      const verbs: Record<string, string> = {
        disable: "disabilitato",
        enable: "riabilitato",
        demote: "declassato a client",
        delete: "eliminato",
      };
      setFeedback({ kind: "ok", text: `${label} ${verbs[action]}.` });
      router.refresh();
    });
  }

  return (
    <>
      {/* Form nuovo admin */}
      <section className="card p-6 mb-8">
        <h2 className="font-bold text-ink mb-4">Nuovo amministratore</h2>

        <div className="inline-flex rounded-lg border border-paper-border p-1 mb-4 bg-paper-soft">
          <button
            type="button"
            onClick={() => setMode("invite")}
            className={`px-4 py-1.5 text-sm rounded-md transition ${
              mode === "invite" ? "bg-white shadow-sm text-ink" : "text-ink-muted"
            }`}
          >
            Invita via email
          </button>
          <button
            type="button"
            onClick={() => setMode("create")}
            className={`px-4 py-1.5 text-sm rounded-md transition ${
              mode === "create" ? "bg-white shadow-sm text-ink" : "text-ink-muted"
            }`}
          >
            Crea con password
          </button>
        </div>

        <form onSubmit={submitNew} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="text-sm">
            <span className="block text-ink-muted mb-1">Email *</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nome@azienda.com"
              className="input w-full"
            />
          </label>
          <label className="text-sm">
            <span className="block text-ink-muted mb-1">Nome completo</span>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Es. Luca Rossi"
              className="input w-full"
            />
          </label>
          {mode === "create" && (
            <label className="text-sm md:col-span-2">
              <span className="block text-ink-muted mb-1">
                Password temporanea * <span className="text-xs">(min 10 caratteri)</span>
              </span>
              <input
                type="text"
                required
                minLength={10}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Almeno 10 caratteri"
                className="input w-full font-mono"
              />
            </label>
          )}
          <div className="md:col-span-2 flex items-center gap-3">
            <button type="submit" className="btn-primary" disabled={busy}>
              {busy
                ? "Attendi…"
                : mode === "invite"
                ? "Invia invito"
                : "Crea admin"}
            </button>
            <p className="text-xs text-ink-muted">
              {mode === "invite"
                ? "L'utente riceverà una mail da Supabase con un link per impostare la password."
                : "L'account viene creato attivo. Dovrai comunicare tu la password all'admin."}
            </p>
          </div>
        </form>

        {feedback && (
          <div
            className={`mt-4 text-sm p-3 rounded-lg ${
              feedback.kind === "ok"
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            {feedback.text}
          </div>
        )}
      </section>

      {/* Lista admin */}
      <section className="card overflow-hidden">
        <header className="px-6 py-4 border-b border-paper-border flex items-center justify-between">
          <h2 className="font-bold text-ink">Amministratori esistenti</h2>
          <span className="text-sm text-ink-muted">{admins.length}</span>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-paper-soft text-left text-xs uppercase tracking-wider text-ink-muted">
              <tr>
                <th className="px-6 py-3">Nome</th>
                <th className="px-6 py-3">Email</th>
                <th className="px-6 py-3">Stato</th>
                <th className="px-6 py-3">Creato</th>
                <th className="px-6 py-3">Ultimo accesso</th>
                <th className="px-6 py-3 text-right">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {admins.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-ink-muted">
                    Nessun amministratore. Aggiungine uno dal form sopra.
                  </td>
                </tr>
              )}
              {admins.map((a) => {
                const isMe = a.id === currentUserId;
                const disabled = a.status === "disabled";
                return (
                  <tr
                    key={a.id}
                    className={`border-t border-paper-border ${
                      disabled ? "bg-red-50/40" : "hover:bg-paper-soft"
                    }`}
                  >
                    <td className="px-6 py-3 font-medium text-ink">
                      {a.full_name ?? <span className="text-ink-muted italic">—</span>}
                      {isMe && (
                        <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-blue-m/10 text-blue-m uppercase tracking-wider">
                          tu
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-ink-muted">{a.email}</td>
                    <td className="px-6 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          disabled
                            ? "bg-red-100 text-red-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {disabled ? "Disabilitato" : "Attivo"}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm text-ink-muted">
                      {new Date(a.created_at).toLocaleDateString("it-IT")}
                    </td>
                    <td className="px-6 py-3 text-sm text-ink-muted">
                      {a.last_login_at
                        ? new Date(a.last_login_at).toLocaleDateString("it-IT")
                        : "—"}
                    </td>
                    <td className="px-6 py-3 text-right">
                      {!isMe ? (
                        <div className="inline-flex gap-2">
                          {disabled ? (
                            <button
                              type="button"
                              onClick={() => runAction(a.id, "enable", a.email)}
                              disabled={busy}
                              className="text-xs px-2 py-1 rounded-md border border-green-300 text-green-700 hover:bg-green-50"
                            >
                              Riabilita
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => runAction(a.id, "disable", a.email)}
                              disabled={busy}
                              className="text-xs px-2 py-1 rounded-md border border-orange-300 text-orange-700 hover:bg-orange-50"
                            >
                              Disabilita
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => runAction(a.id, "demote", a.email)}
                            disabled={busy}
                            className="text-xs px-2 py-1 rounded-md border border-gray-300 text-ink hover:bg-gray-50"
                          >
                            Declassa
                          </button>
                          <button
                            type="button"
                            onClick={() => runAction(a.id, "delete", a.email)}
                            disabled={busy}
                            className="text-xs px-2 py-1 rounded-md border border-red-300 text-red-700 hover:bg-red-50"
                          >
                            Elimina
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-ink-muted italic">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
