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
  const { data: me } = await sb.from("profiles").select("*").eq("id", user.id).single<Profile>();
  if (me?.role !== "admin") redirect("/area");

  return (
    <div className="flex min-h-screen bg-paper-soft">
      <Sidebar role="admin" fullName={me.full_name ?? ""} email={me.email} />
      <main className="flex-1 p-6 md:p-10 max-w-3xl mx-auto w-full">
        <Link href="/admin" className="btn-ghost mb-5">← Dashboard</Link>
        <header className="mb-8">
          <div className="text-xs tracking-widest text-blue-m uppercase">Admin</div>
          <h1 className="text-3xl font-bold text-ink">Nuovo cliente</h1>
          <p className="text-ink-muted mt-1">
            Crea un account con password temporanea — il cliente riceverà le
            credenziali via email (inoltro manuale o attraverso il tuo client).
          </p>
        </header>
        <NewClientForm />
      </main>
    </div>
  );
}
