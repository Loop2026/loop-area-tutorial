"use client";

import { useState, useTransition, use } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Props {
  nextParam: Promise<{ next?: string; error?: string }>;
}

export function LoginForm({ nextParam }: Props) {
  const params = use(nextParam);
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(params.error ?? null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    startTransition(async () => {
      const sb = createClient();
      const { error } = await sb.auth.signInWithPassword({
        email: email.trim(),
        password
      });
      if (error) {
        setErr(
          error.message === "Invalid login credentials"
            ? "Credenziali non valide"
            : error.message
        );
        return;
      }
      // aggiorno last_login_at best-effort (non bloccante)
      const {
        data: { user }
      } = await sb.auth.getUser();
      if (user) {
        await sb.from("profiles").update({ last_login_at: new Date().toISOString() }).eq("id", user.id);
      }
      router.push(params.next || "/area");
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div>
        <label className="block text-sm font-medium text-ink mb-2" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          className="field"
          placeholder="tua@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div>
        <label
          className="block text-sm font-medium text-ink mb-2"
          htmlFor="password"
        >
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          autoComplete="current-password"
          className="field"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      {err && (
        <div
          role="alert"
          className="rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm"
        >
          {err}
        </div>
      )}

      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {pending ? "Accesso in corso…" : "Accedi"}
      </button>
    </form>
  );
}
