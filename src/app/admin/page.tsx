import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";
import type { Profile } from "@/lib/types";

interface ClientRow {
  user_id: string;
  email: string;
  full_name: string | null;
  joined_at: string;
  last_login_at: string | null;
  modules_done: number;
  modules_total: number;
  checklist_done: number;
  checklist_total: number;
  last_activity_at: string;
}

export default async function AdminHome() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await sb
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();
  if (profile?.role !== "admin") redirect("/area");

  const { data: clients } = await sb
    .from("v_client_progress")
    .select("*")
    .order("last_activity_at", { ascending: false });

  const rows = (clients ?? []) as ClientRow[];
  const totalClients = rows.length;
  const activeLast7 = rows.filter((r) =>
    r.last_activity_at
      ? Date.now() - new Date(r.last_activity_at).getTime() < 7 * 86400000
      : false
  ).length;
  const avgProgress = Math.round(
    rows.reduce((sum, r) => sum + (r.modules_total ? r.modules_done / r.modules_total : 0), 0) /
      Math.max(rows.length, 1) *
      100
  );

  return (
    <div className="flex min-h-screen bg-paper-soft">
      <Sidebar
        role="admin"
        fullName={profile.full_name ?? ""}
        email={profile.email}
      />
      <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full">
        <header className="mb-8 flex items-end justify-between flex-wrap gap-4">
          <div>
            <div className="text-xs tracking-widest text-blue-m uppercase">
              Admin Console
            </div>
            <h1 className="text-3xl font-bold text-ink">Panoramica clienti</h1>
            <p className="text-ink-muted mt-1">
              Stato onboarding di tutti i clienti LOOP.
            </p>
          </div>
          <Link href="/admin/new-client" className="btn-primary">
            + Nuovo cliente
          </Link>
        </header>

        {/* KPI */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Kpi label="Clienti totali" value={totalClients.toString()} />
          <Kpi label="Attivi ultimi 7 gg" value={activeLast7.toString()} />
          <Kpi label="Progresso medio" value={`${avgProgress}%`} />
        </section>

        {/* Tabella clienti */}
        <section className="card overflow-hidden">
          <header className="px-6 py-4 border-b border-paper-border flex items-center justify-between">
            <h2 className="font-bold text-ink">Clienti</h2>
            <span className="text-sm text-ink-muted">{rows.length}</span>
          </header>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-paper-soft text-left text-xs uppercase tracking-wider text-ink-muted">
                <tr>
                  <th className="px-6 py-3">Nome</th>
                  <th className="px-6 py-3">Email</th>
                  <th className="px-6 py-3">Progresso</th>
                  <th className="px-6 py-3">Checklist</th>
                  <th className="px-6 py-3">Ultima attività</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-ink-muted">
                      Nessun cliente ancora. Crea il primo con &ldquo;+ Nuovo cliente&rdquo;.
                    </td>
                  </tr>
                )}
                {rows.map((c) => {
                  const pct =
                    c.modules_total > 0 ? Math.round((c.modules_done / c.modules_total) * 100) : 0;
                  return (
                    <tr key={c.user_id} className="border-t border-paper-border hover:bg-paper-soft">
                      <td className="px-6 py-3 font-medium text-ink">
                        {c.full_name ?? <span className="text-ink-muted italic">—</span>}
                      </td>
                      <td className="px-6 py-3 text-ink-muted">{c.email}</td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <div className="progress-bar w-32"><span style={{ width: `${pct}%` }} /></div>
                          <span className="text-xs text-ink-muted w-14">
                            {c.modules_done}/{c.modules_total}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-sm text-ink">
                        {c.checklist_done}/{c.checklist_total}
                      </td>
                      <td className="px-6 py-3 text-sm text-ink-muted">
                        {fmtRelative(c.last_activity_at)}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <Link href={`/admin/clients/${c.user_id}`} className="text-blue-m font-medium hover:underline">
                          Dettaglio →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-5">
      <div className="text-xs tracking-wider text-ink-muted uppercase">{label}</div>
      <div className="text-3xl font-bold text-ink mt-1">{value}</div>
    </div>
  );
}

function fmtRelative(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return "ora";
  if (min < 60) return `${min} min fa`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h}h fa`;
  const gg = Math.round(h / 24);
  if (gg < 30) return `${gg}g fa`;
  return d.toLocaleDateString("it-IT");
}
