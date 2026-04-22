"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AdminRow } from "./page";

interface Props {
  initialAdmins: AdminRow[];
  currentUserId: string;
}

export function AdminsClient({ initialAdmins, currentUserId }: Props) {
  const router = useRouter();
  const [admins, setAdmins] = useState<AdminRow[]>(initialAdmins);
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [customPassword, setCustomPassword] = useState("");
  const [usePasswordCustom, setUsePasswordCustom] = useState(false);
  const [busy, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<
    | { kind: "ok"; text: string }
    | { kind: "err"; text: string }
    | null
  >(null);
  const [newCredentials, setNewCredentials] = useState<{
    email: string;
    password: string;
    label: string;
  } | null>(null);

  async function submitNew(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    setNewCredentials(null);

    if (usePasswordCustom && customPassword.trim().length < 10) {
      setFeedback({
        kind: "err",
        text: "La password personalizzata deve essere di almeno 10 caratteri.",
      });
      return;
    }

    startTransition(async () => {
      const res = await fetch("/api/admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          password: usePasswordCustom ? customPassword.trim() : undefined,
        }),
      });
      const json = await res.json();

      if (!res.ok) {
        setFeedback({ kind: "err", text: json.error ?? "Errore imprevisto" });
        return;
      }

      setNewCredentials({
        email: json.email,
        password: json.password,
        label: "Admin creato",
      });
      setEmail("");
      setFirstName("");
      setLastName("");
      setCustomPassword("");
      setUsePasswordCustom(false);
      router.refresh();
    });
  }

  async function resetPassword(id: string, targetEmail: string) {
    if (
      !confirm(
        `Generare una nuova password per ${targetEmail}? La precedente smetterà subito di funzionare.`
      )
    )
      return;
    setFeedback(null);
    setNewCredentials(null);
    startTransition(async () => {
      const res = await fetch(`/api/admin/admins/${id}/reset-password`, {
        method: "POST",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFeedback({ kind: "err", text: json.error ?? "Errore imprevisto" });
        return;
      }
      setNewCredentials({
        email: targetEmail,
        password: json.password,
        label: "Nuova password generata",
      });
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

    if (action === "delete") {
      if (
        !confirm(
          `Sei sicuro di voler eliminare ${label}? Tutti i dati associati (progressi, checklist, log) verranno persi. Conferma una seconda volta per procedere.`
        )
      )
        return;
    }

    setFeedback(null);
    setNewCredentials(null);
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
            a.id === id
              ? { ...a, status: action === "disable" ? "disabled" : "active" }
              : a
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

  function copy(text: string) {
    navigator.clipboard.writeText(text);
    setFeedback({ kind: "ok", text: "Password copiata negli appunti." });
    setTimeout(() => setFeedback(null), 2000);
  }

  function generateSuggestion() {
    const alphabet =
      "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    let out = "";
    const bytes = new Uint8Array(12);
    crypto.getRandomValues(bytes);
    for (let i = 0; i < 12; i++) out += alphabet[bytes[i] % alphabet.length];
    setCustomPassword(out);
  }

  function buildMailto(toEmail: string, password: string) {
    const loginUrl =
      typeof window !== "undefined" ? `${window.location.origin}/login` : "/login";
    const subject = encodeURIComponent("Credenziali Admin Console LOOP");
    const body = encodeURIComponent(
      `Ciao,

ecco le credenziali per accedere come amministratore all'Area Tutorial LOOP:

   • Indirizzo: ${loginUrl}
   • Tab:       Admin
   • Email:     ${toEmail}
   • Password:  ${password}

Ti consigliamo di cambiarla al primo accesso.

A presto,
Team LOOP
`
    );
    return `mailto:${toEmail}?subject=${subject}&body=${body}`;
  }

  return (
    <>
      {/* Form nuovo admin — niente modalità, niente email Supabase */}
      <section className="a-panel mb-8">
        <div className="a-panel-h">
          <h2>Nuovo amministratore</h2>
          <span className="meta">
            {usePasswordCustom ? "password custom" : "password auto-generata"}
          </span>
        </div>
        <div className="a-panel-b">
          <p className="text-sm text-[var(--ink-slate)] mb-4">
            Inserisci email, nome e cognome. Puoi lasciare che il sistema
            generi una password temporanea oppure impostarla tu manualmente.
            <strong> Nessuna email viene inviata da Supabase.</strong>
          </p>

          <form
            onSubmit={submitNew}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <label className="text-sm md:col-span-2">
              <span className="block text-[var(--ink-slate)] mb-1">
                Email *
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@azienda.com"
                className="a-field w-full"
              />
            </label>
            <label className="text-sm">
              <span className="block text-[var(--ink-slate)] mb-1">Nome</span>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Luca"
                className="a-field w-full"
              />
            </label>
            <label className="text-sm">
              <span className="block text-[var(--ink-slate)] mb-1">Cognome</span>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Rossi"
                className="a-field w-full"
              />
            </label>

            <div className="md:col-span-2 border-t pt-4">
              <label className="inline-flex items-center gap-2 text-sm mb-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={usePasswordCustom}
                  onChange={(e) => setUsePasswordCustom(e.target.checked)}
                />
                <span>Voglio impostare io la password</span>
              </label>
              {usePasswordCustom && (
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <input
                    type="text"
                    value={customPassword}
                    onChange={(e) => setCustomPassword(e.target.value)}
                    placeholder="Almeno 10 caratteri"
                    className="a-field flex-1 min-w-[220px] font-mono text-sm"
                    minLength={10}
                  />
                  <button
                    type="button"
                    onClick={generateSuggestion}
                    className="a-btn a-btn-ghost text-xs"
                  >
                    Suggerisci
                  </button>
                </div>
              )}
              {!usePasswordCustom && (
                <p className="text-xs text-[var(--ink-slate)]">
                  Verrà generata una password temporanea di 12 caratteri
                  casuali — la vedrai una volta sola qui sotto.
                </p>
              )}
            </div>

            <div className="md:col-span-2">
              <button type="submit" className="a-btn a-btn-primary" disabled={busy}>
                {busy ? "Creo…" : "Crea admin"}
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Credenziali mostrate UNA volta (post-create o post-reset) */}
      {newCredentials && (
        <div className="a-alert a-alert-warn mb-6">
          <span>🔑</span>
          <div className="flex-1">
            <div className="font-bold mb-2">
              {newCredentials.label} — credenziali (mostrate UNA volta)
            </div>
            <div className="text-sm mb-3">
              <strong>Email:</strong> {newCredentials.email}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <code className="font-mono text-base bg-white px-3 py-2 rounded-lg border border-amber-300">
                {newCredentials.password}
              </code>
              <button
                type="button"
                className="a-btn a-btn-ghost text-xs"
                onClick={() => copy(newCredentials.password)}
              >
                Copia
              </button>
              <a
                href={buildMailto(newCredentials.email, newCredentials.password)}
                target="_blank"
                rel="noopener"
                className="a-btn a-btn-primary text-xs"
              >
                ✉ Invia via email
              </a>
            </div>
            <div className="text-xs mt-2 text-amber-800">
              Uscendo dalla pagina la password non sarà più recuperabile.
              Salvala o inviala subito.
            </div>
          </div>
        </div>
      )}

      {feedback && !newCredentials && (
        <div
          className={`a-alert ${
            feedback.kind === "ok" ? "a-alert-info" : "a-alert-err"
          } mb-6`}
        >
          <span>{feedback.kind === "ok" ? "ℹ" : "⚠"}</span>
          <div>{feedback.text}</div>
        </div>
      )}

      {/* Lista admin */}
      <section className="a-panel overflow-hidden">
        <div className="a-panel-h">
          <h2>Amministratori esistenti</h2>
          <span className="meta">{admins.length}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="a-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Email</th>
                <th>Stato</th>
                <th>Creato</th>
                <th>Ultimo accesso</th>
                <th className="text-right">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {admins.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center text-[var(--ink-slate)] py-10">
                    Nessun amministratore. Aggiungine uno dal form sopra.
                  </td>
                </tr>
              )}
              {admins.map((a) => {
                const isMe = a.id === currentUserId;
                const disabled = a.status === "disabled";
                const displayName =
                  [a.first_name, a.last_name].filter(Boolean).join(" ") ||
                  a.full_name;
                return (
                  <tr key={a.id}>
                    <td className="font-semibold text-[var(--navy)]">
                      {displayName ?? (
                        <span className="text-[var(--ink-slate)] italic font-normal">
                          —
                        </span>
                      )}
                      {isMe && (
                        <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-[var(--blue-m)]/10 text-[var(--blue-m)] uppercase tracking-wider">
                          tu
                        </span>
                      )}
                    </td>
                    <td className="text-[var(--ink-slate)]">{a.email}</td>
                    <td>
                      {disabled ? (
                        <span className="pill pill-off">
                          <span className="d" />
                          Disabilitato
                        </span>
                      ) : (
                        <span className="pill pill-ok">
                          <span className="d" />
                          Attivo
                        </span>
                      )}
                    </td>
                    <td className="text-sm text-[var(--ink-slate)]">
                      {new Date(a.created_at).toLocaleDateString("it-IT")}
                    </td>
                    <td className="text-sm text-[var(--ink-slate)]">
                      {a.last_login_at
                        ? new Date(a.last_login_at).toLocaleDateString("it-IT")
                        : "—"}
                    </td>
                    <td className="text-right">
                      {!isMe ? (
                        <div className="inline-flex gap-2 flex-wrap justify-end">
                          <button
                            type="button"
                            onClick={() => resetPassword(a.id, a.email)}
                            disabled={busy}
                            className="text-xs px-2 py-1 rounded-md border border-[var(--blue-m)]/30 text-[var(--blue-m)] hover:bg-[var(--blue-m)]/5"
                          >
                            🔑 Password
                          </button>
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
                              onClick={() =>
                                runAction(a.id, "disable", a.email)
                              }
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
                            className="text-xs px-2 py-1 rounded-md border border-gray-300 text-[var(--ink)] hover:bg-gray-50"
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
                        <span className="text-xs text-[var(--ink-slate)] italic">
                          —
                        </span>
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
