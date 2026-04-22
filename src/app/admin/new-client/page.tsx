import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";
import { NewClientForm } from "./NewClientForm";
import type { Profile } from "@/lib/types";

export default async function NewClient() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");
  const { data: me } = await sb
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();
  if (me?.role !== "admin") redirect("/area");

  return (
    <div className="flex min-h-screen bg-[var(--off)]">
      <Sidebar
        role="admin"
        fullName={me.full_name ?? ""}
        email={me.email}
      />

      <main className="flex-1 min-w-0 pt-16 md:pt-0">
        <div className="admin-page" style={{ maxWidth: 760 }}>
          <Link
            href="/admin"
            className="text-sm text-[var(--ink-slate)] hover:text-[var(--ink)] mb-6 inline-block"
          >
            ← Torna alla panoramica
          </Link>

          <header className="mb-7">
            <div className="admin-eyebrow">
              <span className="d" />
              ADMIN · NUOVO CLIENTE
            </div>
            <h1 className="admin-h1">
              Crea un <em>nuovo cliente</em>.
            </h1>
            <p className="text-[15px] text-[var(--ink-slate)] mt-2">
              Genero un account con password temporanea, poi puoi inviare le
              credenziali al cliente con un click (apre il tuo client email
              precompilato).
            </p>
          </header>

          <NewClientForm />
        </div>
      </main>
    </div>
  );
}
