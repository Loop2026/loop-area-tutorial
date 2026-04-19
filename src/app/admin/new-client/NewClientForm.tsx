"use client";

import { useState, useTransition } from "react";

export function NewClientForm() {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [result, setResult] = useState<
    | null
    | { ok: true; email: string; password: string; userId: string }
    | { ok: false; error: string }
  >(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);
    startTransition(async () => {
      const r = await fetch("/api/admin/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), fullName: fullName.trim() })
      });
      const j = await r.json();
      if (!r.ok) setResult({ ok: false, error: j.error ?? "Errore" });
      else setResult({ ok: true, ...j });
    });
  }

  return (
    <div className="card p-6">
      {result?.ok ? (
        <div>
          <div className="rounded-xl bg-green-50 border border-green-200 text-green-800 p-4 mb-5">
            <div className="font-bold mb-1">Cliente creato ✓</div>
            <div className="text-sm">
              Copia queste credenziali e inviale al cliente. La password viene mostrata UNA SOLA volta.
            </div>
          </div>
          <dl className="space-y-3 text-sm">
            <Field label="Email">{result.email}</Field>
            <Field label="Password iniziale" mono>
              {result.password}
            </Field>
            <Field label="User ID" mono>
              {result.userId}
            </Field>
          </dl>
          <div className="mt-6 flex gap-3">
            <button
              className="btn-ghost"
              onClick={() => {
                setResult(null);
                setEmail("");
                setFullName("");
              }}
            >
              Crea un altro
            </button>
            <a href="/admin" className="btn-primary">Torna alla dashboard</a>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-2">
              Email cliente
            </label>
            <input
              type="email"
              required
              className="field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="cliente@esempio.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-2">
              Nome completo
            </label>
            <input
              type="text"
              className="field"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Mario Rossi"
            />
          </div>
          {result?.ok === false && (
            <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">
              {result.error}
            </div>
          )}
          <button type="submit" className="btn-primary" disabled={pending}>
            {pending ? "Creazione…" : "Crea cliente"}
          </button>
        </form>
      )}
    </div>
  );
}

function Field({ label, children, mono }: { label: string; children: React.ReactNode; mono?: boolean }) {
  return (
    <div className="grid grid-cols-[140px_1fr] items-center gap-3 border-b border-paper-border pb-2">
      <dt className="text-xs uppercase tracking-wider text-ink-muted">{label}</dt>
      <dd className={["text-ink", mono ? "font-mono" : ""].join(" ")}>{children}</dd>
    </div>
  );
}
