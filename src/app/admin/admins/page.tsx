import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";
import { AdminsClient } from "./AdminsClient";
import type { Profile } from "@/lib/types";

export interface AdminRow {
  id: string;
  email: string;
  full_name: string | null;
  role: "admin" | "client";
  status: "active" | "disabled" | string;
  created_at: string;
  last_login_at: string | null;
}

export default async function AdminsPage() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await sb
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();
  if (profile?.role !== "admin") redirect("/area");

  // Service role per vedere tutti gli admin
  const admin = createAdminClient();
  const { data: admins } = await admin
    .from("profiles")
    .select("id, email, full_name, role, status, created_at, last_login_at")
    .eq("role", "admin")
    .order("created_at", { ascending: true });

  return (
    <div className="flex min-h-screen bg-paper-soft">
      <Sidebar
        role="admin"
        fullName={profile.full_name ?? ""}
        email={profile.email}
      />
      <main className="flex-1 p-6 md:p-10 max-w-6xl mx-auto w-full pt-16 md:pt-10">
        <header className="mb-8">
          <div className="text-xs tracking-widest text-blue-m uppercase">
            Admin Console
          </div>
          <h1 className="text-3xl font-bold text-ink">Amministratori</h1>
          <p className="text-ink-muted mt-1">
            Gestisci gli account con accesso all&rsquo;Admin Console. Puoi invitare un nuovo
            admin via email, crearlo direttamente, o disabilitare e rimuovere quelli esistenti.
          </p>
        </header>

        <AdminsClient
          initialAdmins={(admins ?? []) as AdminRow[]}
          currentUserId={user.id}
        />
      </main>
    </div>
  );
}
