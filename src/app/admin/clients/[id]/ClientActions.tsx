"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface Props {
  clientId: string;
  clientEmail: string;
  clientName: string;
  initialStatus: "active" | "disabled";
}

export function ClientActions({
  clientId,
  clientEmail,
  clientName,
  initialStatus,
}: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<"active" | "disabled">(initialStatus);
  const [pending, startTransition] = useTransition();
  const [newPwd, setNewPwd] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  function deleteClient() {
    if (
      !confirm(
        `Eliminare definitivamente ${clientEmail}? L'operazione è irreversibile: progressi, checklist e dati collegati verranno persi.`
      )
    )
      return;
    if (
      !confirm(
        `Confermi l'eliminazione di ${clientEmail}? Seconda conferma richiesta per sicurezza.`
      )
    )
      return;
    setError(null);
    setInfo(null);
    setNewPwd(null);
    startTransition(async () => {
      const r = await fetch(`/api/admin/clients/${clientId}`, {
        method: "DELETE",
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(j.error ?? "Errore durante l'eliminazione");
        return;
      }
      router.replace("/admin/clients");
      router.refresh();
    });
  }

  function toggleStatus() {
    const next = status === "active" ? "disabled" : "active";
    if (
      next === "disabled" &&
      !confirm(
        `Sospendere l'accesso di ${clientEmail}? Non potrà più entrare nell'area finché non lo riattivi.`
      )
    )
      return;
    setError(null);
    setInfo(null);
    startTransition(async () => {
      const r = await fetch(`/api/admin/clients/${clientId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(j.error ?? "Errore");
        return;
      }
      setStatus(next);
      setInfo(next === "active" ? "Cliente riattivato." : "Cliente sospeso.");
    });
  }

  function resendPassword() {
    if (
      !confirm(
        `Generare una nuova password temporanea per ${clientEmail}? La precedente smetterà subito di funzionare.`
      )
    )
      return;
    setError(null);
    setInfo(null);
    setNewPwd(null);
    startTransition(async () => {
      const r = await fetch(`/api/admin/clients/${clientId}/resend-password`, {
        method: "POST",
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(j.error ?? "Errore");
        return;
      }
      setNewPwd(j.password);
    });
  }

  function buildMailtoCredentials(): string {
    if (!newPwd) return "#";
    const loginUrl = `${window.location.origin}/login`;
    const subject = encodeURIComponent("Nuova password Area Tutorial LOOP");
    const body = encodeURIComponent(
      `Ciao${clientName ? " " + clientName.split(" ")[0] : ""},

abbiamo generato una nuova password per accedere all'Area Tutorial LOOP:

   • Indirizzo: ${loginUrl}
   • Email:     ${clientEmail}
   • Password:  ${newPwd}

Per sicurezza ti consigliamo di cambiarla al primo accesso.

A presto,
Supporto LOOP
support@loop-online.com
`
    );
    return `mailto:${clientEmail}?subject=${subject}&body=${body}`;
  }

  function buildMailtoGeneric(): string {
    const subject = encodeURIComponent("Area Tutorial LOOP");
    const body = encodeURIComponent(
      `Ciao${clientName ? " " + clientName.split(" ")[0] : ""},

`
    );
    return `mailto:${clientEmail}?subject=${subject}&body=${body}`;
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text);
    setInfo("Password copiata negli appunti.");
    setTimeout(() => setInfo(null), 2000);
  }

  return (
    <div className="a-panel">
      <div className="a-panel-h">
        <h2>Azioni cliente</h2>
        <span className="meta">credenziali, stato, comunicazioni</span>
      </div>
      <div className="a-panel-b space-y-4">
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className={
              status === "active" ? "a-btn a-btn-danger" : "a-btn a-btn-success"
            }
            onClick={toggleStatus}
            disabled={pending}
          >
            {status === "active"
              ? "⏸ Sospendi accesso"
              : "▶ Riattiva cliente"}
          </button>

          <button
            type="button"
            className="a-btn a-btn-ghost"
            onClick={resendPassword}
            disabled={pending}
          >
            🔑 Genera nuova password
          </button>

          <a
            href={buildMailtoGeneric()}
            target="_blank"
            rel="noopener"
            className="a-btn a-btn-ghost"
          >
            ✉ Scrivi al cliente
          </a>

          <button
            type="button"
            className="a-btn a-btn-danger ml-auto"
            onClick={deleteClient}
            disabled={pending}
          >
            🗑 Elimina cliente
          </button>
        </div>

        {error && (
          <div className="a-alert a-alert-err">
            <span>⚠</span>
            <div>{error}</div>
          </div>
        )}
        {info && !newPwd && (
          <div className="a-alert a-alert-info">
            <span>ℹ</span>
            <div>{info}</div>
          </div>
        )}

        {newPwd && (
          <div className="a-alert a-alert-warn">
            <span>🔑</span>
            <div className="flex-1">
              <div className="font-bold mb-2">
                Nuova password generata (mostrata UNA volta)
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <code className="font-mono text-base bg-white px-3 py-2 rounded-lg border border-amber-300">
                  {newPwd}
                </code>
                <button
                  type="button"
                  className="a-btn a-btn-ghost text-xs"
                  onClick={() => copy(newPwd)}
                >
                  Copia
                </button>
                <a
                  href={buildMailtoCredentials()}
                  target="_blank"
                  rel="noopener"
                  className="a-btn a-btn-primary text-xs"
                >
                  ✉ Invia via email
                </a>
              </div>
              <div className="text-xs mt-2 text-amber-800">
                Salva o invia subito la password — uscendo dalla pagina non
                sarà più recuperabile.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
