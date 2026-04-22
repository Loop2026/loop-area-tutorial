"use client";

import { useState, useTransition } from "react";

type ResultState =
  | null
  | { ok: true; email: string; password: string; userId: string }
  | { ok: false; error: string };

export function NewClientForm() {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [customPassword, setCustomPassword] = useState("");
  const [usePasswordCustom, setUsePasswordCustom] = useState(false);
  const [result, setResult] = useState<ResultState>(null);
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);

    if (usePasswordCustom && customPassword.trim().length < 10) {
      setResult({
        ok: false,
        error: "La password personalizzata deve essere di almeno 10 caratteri.",
      });
      return;
    }

    startTransition(async () => {
      const r = await fetch("/api/admin/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          password: usePasswordCustom ? customPassword.trim() : undefined,
        }),
      });
      const j = await r.json();
      if (!r.ok) setResult({ ok: false, error: j.error ?? "Errore" });
      else setResult({ ok: true, ...j });
    });
  }

  function copy(label: string, value: string) {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(label);
      setTimeout(() => setCopied(null), 1500);
    });
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

  function buildMailto(): string {
    if (!result?.ok) return "#";
    const loginUrl = `${window.location.origin}/login`;
    const subject = encodeURIComponent(
      "Le tue credenziali per l'Area Tutorial LOOP"
    );
    const greetName = firstName || "";
    const body = encodeURIComponent(
      `Ciao${greetName ? " " + greetName : ""},

ti diamo il benvenuto nell'Area Tutorial LOOP — il percorso di onboarding al sistema di arbitraggio matematico su XAUUSD.

Queste sono le tue credenziali di accesso:

   • Indirizzo: ${loginUrl}
   • Email:     ${result.email}
   • Password:  ${result.password}

Per motivi di sicurezza ti consigliamo di cambiare la password al primo accesso.

Se hai domande tecniche o operative scrivi a support@loop-online.com — il servizio di assistenza tecnica LOOP è gratuito.

A presto,
Supporto LOOP
support@loop-online.com
`
    );
    return `mailto:${result.email}?subject=${subject}&body=${body}`;
  }

  if (result?.ok) {
    return (
      <div className="space-y-5">
        <div className="a-alert a-alert-ok">
          <span className="text-lg leading-none">✓</span>
          <div>
            <div className="font-bold mb-1">Cliente creato correttamente</div>
            <div>
              Le credenziali qui sotto sono mostrate <b>una sola volta</b>. Inviale
              al cliente con il pulsante &ldquo;Invia via email&rdquo; oppure
              copiale manualmente.
            </div>
          </div>
        </div>

        <div className="a-panel">
          <div className="a-panel-h">
            <h2>Credenziali di accesso</h2>
            <span className="meta">password mostrata UNA volta</span>
          </div>
          <div className="a-panel-b">
            <dl className="space-y-0">
              <div className="a-cred-row">
                <dt>Email</dt>
                <dd>{result.email}</dd>
                <button
                  type="button"
                  className="a-btn a-btn-ghost text-xs"
                  onClick={() => copy("email", result.email)}
                >
                  {copied === "email" ? "Copiata" : "Copia"}
                </button>
              </div>
              <div className="a-cred-row">
                <dt>Password</dt>
                <dd className="mono text-base">{result.password}</dd>
                <button
                  type="button"
                  className="a-btn a-btn-ghost text-xs"
                  onClick={() => copy("password", result.password)}
                >
                  {copied === "password" ? "Copiata" : "Copia"}
                </button>
              </div>
              <div className="a-cred-row">
                <dt>User ID</dt>
                <dd className="mono text-xs text-[var(--ink-slate)]">
                  {result.userId}
                </dd>
                <span />
              </div>
            </dl>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <a
            href={buildMailto()}
            className="a-btn a-btn-primary"
            target="_blank"
            rel="noopener"
          >
            ✉ Invia credenziali via email
          </a>
          <button
            type="button"
            className="a-btn a-btn-ghost"
            onClick={() => {
              setResult(null);
              setEmail("");
              setFirstName("");
              setLastName("");
              setCustomPassword("");
              setUsePasswordCustom(false);
            }}
          >
            Crea un altro cliente
          </button>
          <a href="/admin" className="a-btn a-btn-ghost">
            Torna alla panoramica
          </a>
        </div>

        <p className="text-xs text-[var(--ink-slate)]">
          Il bottone &ldquo;Invia&rdquo; apre il tuo client email predefinito
          (Mail / Gmail / Outlook) con destinatario, oggetto e corpo già
          compilati. Premi &ldquo;Invia&rdquo; nel client per spedire.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="a-panel">
      <div className="a-panel-b space-y-4">
        <div>
          <label className="a-label">Email cliente</label>
          <input
            type="email"
            required
            className="a-field"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="cliente@esempio.com"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="a-label">Nome</label>
            <input
              type="text"
              className="a-field"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Mario"
            />
          </div>
          <div>
            <label className="a-label">Cognome</label>
            <input
              type="text"
              className="a-field"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Rossi"
            />
          </div>
        </div>

        <div className="border-t pt-4">
          <label className="inline-flex items-center gap-2 text-sm mb-2 cursor-pointer">
            <input
              type="checkbox"
              checked={usePasswordCustom}
              onChange={(e) => setUsePasswordCustom(e.target.checked)}
            />
            <span>Voglio impostare io la password</span>
          </label>
          {usePasswordCustom ? (
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
          ) : (
            <p className="text-xs text-[var(--ink-slate)]">
              Verrà generata automaticamente una password temporanea di 12
              caratteri casuali — la vedrai una volta sola dopo la creazione.
            </p>
          )}
        </div>

        {result?.ok === false && (
          <div className="a-alert a-alert-err">
            <span>⚠</span>
            <div>{result.error}</div>
          </div>
        )}
        <div className="pt-2">
          <button
            type="submit"
            className="a-btn a-btn-primary"
            disabled={pending}
          >
            {pending ? "Creazione…" : "Crea cliente"}
          </button>
        </div>
      </div>
    </form>
  );
}
