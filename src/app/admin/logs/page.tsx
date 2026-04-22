import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";
import { LogsClient } from "./LogsClient";
import type { Profile } from "@/lib/types";

export default async function LogsPage() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await sb
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();
  if (profile?.role !== "admin") redirect("/area");

  return (
    <div className="flex min-h-screen bg-paper-soft">
      <Sidebar
        role="admin"
        fullName={profile.full_name ?? ""}
        email={profile.email}
      />
      <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full pt-16 md:pt-10">
        <header className="mb-8">
          <div className="text-xs tracking-widest text-blue-m uppercase">
            Admin Console
          </div>
          <h1 className="text-3xl font-bold text-ink">Log di sistema</h1>
          <p className="text-ink-muted mt-1">
            Storico eventi di autenticazione e azioni amministrative. I log sono immutabili,
            filtrabili e conservati per audit.
          </p>
        </header>

        <LogsClient />
      </main>
    </div>
  );
}
