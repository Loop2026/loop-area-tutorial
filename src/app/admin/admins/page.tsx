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

  const admin = createAdminClient();
  const { data: admins } = await admin
    .from("profiles")
    .select("id, email, full_name, role, status, created_at, last_login_at")
    .eq("role", "admin")
    .order("created_at", { ascending: true });

  return (
    <div className="flex min-h-screen bg-[var(--off)]">
      <Sidebar
        role="admin"
        fullName={profile.full_name ?? ""}
        email={profile.email}
      />

      <main className="flex-1 min-w-0 pt-16 md:pt-0">
        <div className="admin-page">
          <header className="mb-8">
            <div className="admin-eyebrow">
              <span className="d" />
              ADMIN · AMMINISTRATORI
            </div>
            <h1 className="admin-h1">
              Gestione <em>amministratori</em>.
            </h1>
            <p className="text-[15px] text-[var(--ink-slate)] mt-2 max-w-2xl">
              Crea nuovi account admin con password generata automaticamente,
              rigenera credenziali, sospendi o elimina. Nessuna email viene
              mai inviata da Supabase — le credenziali le comunichi tu
              manualmente.
            </p>
          </header>

          <AdminsClient
            initialAdmins={(admins ?? []) as AdminRow[]}
            currentUserId={user.id}
          />
        </div>
      </main>
    </div>
  );
}
