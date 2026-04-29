"use client";

import { useState, useTransition, use } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Props {
  nextParam: Promise<{ next?: string; error?: string }>;
}

type Role = "client" | "admin";

export function LoginForm({ nextParam }: Props) {
  const params = use(nextParam);
  const router = useRouter();
  const [role, setRole] = useState<Role>("client");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(params.error ?? null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    startTransition(async () => {
      const sb = createClient();
      const attemptedEmail = email.trim();
      const { error } = await sb.auth.signInWithPassword({
        email: attemptedEmail,
        password,
      });
      if (error) {
        setErr(
          error.message === "Invalid login credentials"
            ? "Credenziali non valide"
            : error.message
        );
        void fetch("/api/auth/event", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "failed", email: attemptedEmail }),
        }).catch(() => {});
        return;
      }

      // Verifica che il role selezionato combaci con quello effettivo
      const {
        data: { user },
      } = await sb.auth.getUser();
      if (!user) {
        setErr("Sessione non valida. Riprova.");
        return;
      }
      const { data: profile } = await sb
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      const actualRole = (profile as { role?: Role } | null)?.role ?? "client";

      if (role === "admin" && actualRole !== "admin") {
        await sb.auth.signOut();
        setErr(
          "Questo account non ha permessi amministratore. Usa il tab Cliente."
        );
        return;
      }
      if (role === "client" && actualRole === "admin") {
        await sb.auth.signOut();
        setErr(
          "Questo è un account amministratore. Usa il tab Admin per accedere."
        );
        return;
      }

      await sb
        .from("profiles")
        .update({ last_login_at: new Date().toISOString() })
        .eq("id", user.id);

      try {
        await fetch("/api/auth/event", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "login" }),
        });
      } catch {
        // log best-effort
      }

      const dest =
        params.next || (actualRole === "admin" ? "/admin" : "/area");
      router.push(dest);
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {/* Segmented control Cliente / Admin */}
      <div
        role="tablist"
        aria-label="Tipo di accesso"
        className="role-switch"
      >
        <button
          type="button"
          role="tab"
          aria-selected={role === "client"}
          onClick={() => {
            setRole("client");
            setErr(null);
          }}
          className={`role-switch-opt ${role === "client" ? "is-active" : ""}`}
        >
          Cliente
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={role === "admin"}
          onClick={() => {
            setRole("admin");
            setErr(null);
          }}
          className={`role-switch-opt ${role === "admin" ? "is-active" : ""}`}
        >
          Admin
        </button>
      </div>

      <div>
        <label
          className="block text-sm font-medium text-ink mb-2"
          htmlFor="email"
        >
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          className="field"
          placeholder={
            role === "admin" ? "admin@loop-online.com" : "tua@email.com"
          }
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

      <button
        type="submit"
        disabled={pending}
        className="btn-primary w-full py-4 text-base font-bold tracking-wide rounded-xl shadow-md hover:shadow-lg active:translate-y-px transition disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {pending
          ? "Accesso in corso…"
          : role === "admin"
          ? "Entra come Admin"
          : "Entra come Cliente"}
      </button>
    </form>
  );
}
