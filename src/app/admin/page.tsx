import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";
import type { Profile } from "@/lib/types";

interface ClientRow {
  user_id: string;
  email: string;
  full_name: string | null;
  status?: "active" | "disabled" | null;
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
  const disabled = rows.filter((r) => r.status === "disabled").length;
  const avgProgress =
    rows.length > 0
      ? Math.round(
          (rows.reduce(
            (sum, r) =>
              sum + (r.modules_total ? r.modules_done / r.modules_total : 0),
            0
          ) /
            rows.length) *
            100
        )
      : 0;

  return (
    <div className="flex min-h-screen bg-[var(--off)]">
      <Sidebar
        role="admin"
        fullName={profile.full_name ?? ""}
        email={profile.email}
      />

      <main className="flex-1 min-w-0 pt-16 md:pt-0">
        <div className="admin-page">
        <header className="mb-8 flex items-end justify-between flex-wrap gap-4">
          <div>
            <div className="admin-eyebrow">
              <span className="d" />
              ADMIN CONSOLE · CLIENTI
            </div>
            <h1 className="admin-h1">
              Panoramica <em>clienti</em>.
            </h1>
            <p className="text-[15px] text-[var(--ink-slate)] mt-2 max-w-2xl">
              Stato onboarding di tutti i clienti LOOP. Da qui puoi creare
              nuovi account, vedere il progresso e gestire le credenziali.
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/admin/modules" className="a-btn a-btn-ghost">
              Gestisci moduli
            </Link>
            <Link href="/admin/new-client" className="a-btn a-btn-primary">
              + Nuovo cliente
            </Link>
          </div>
        </header>

        {/* KPI */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="a-kpi">
            <div className="lbl">Clienti totali</div>
            <div className="val">{totalClients}</div>
            <div className="sub">In anagrafica</div>
          </div>
          <div className="a-kpi">
            <div className="lbl">Attivi 7 gg</div>
            <div className="val">{activeLast7}</div>
            <div className="sub">Hanno aperto l&apos;area</div>
          </div>
          <div className="a-kpi">
            <div className="lbl">Progresso medio</div>
            <div className="val">{avgProgress}%</div>
            <div className="sub">Su {totalClients || 0} clienti</div>
          </div>
          <div className="a-kpi">
            <div className="lbl">Disattivati</div>
            <div className="val">{disabled}</div>
            <div className="sub">Accesso sospeso</div>
          </div>
        </section>

        {/* Tabella clienti */}
        <section className="a-panel overflow-hidden">
          <div className="a-panel-h">
            <h2>Clienti</h2>
            <span className="meta">{rows.length} record</span>
          </div>
          <div className="overflow-x-auto">
            <table className="a-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Email</th>
                  <th>Stato</th>
                  <th>Progresso</th>
                  <th>Checklist</th>
                  <th>Ultima attività</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center text-[var(--ink-slate)] py-12">
                      Nessun cliente ancora. Crea il primo con &ldquo;+ Nuovo cliente&rdquo;.
                    </td>
                  </tr>
                )}
                {rows.map((c) => {
                  const pct =
                    c.modules_total > 0
                      ? Math.round((c.modules_done / c.modules_total) * 100)
                      : 0;
                  const status = c.status ?? "active";
                  return (
                    <tr key={c.user_id}>
                      <td className="font-semibold text-[var(--navy)]">
                        {c.full_name ?? (
                          <span className="text-[var(--ink-slate)] italic font-normal">
                            —
                          </span>
                        )}
                      </td>
                      <td className="text-[var(--ink-slate)]">{c.email}</td>
                      <td>
                        {status === "active" ? (
                          <span className="pill pill-ok">
                            <span className="d" />
                            Attivo
                          </span>
                        ) : (
                          <span className="pill pill-off">
                            <span className="d" />
                            Sospeso
                          </span>
                        )}
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="progress-bar w-28">
                            <span style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-[var(--ink-slate)] w-12">
                            {c.modules_done}/{c.modules_total}
                          </span>
                        </div>
                      </td>
                      <td className="text-sm">
                        {c.checklist_done}/{c.checklist_total}
                      </td>
                      <td className="text-sm text-[var(--ink-slate)]">
                        {fmtRelative(c.last_activity_at)}
                      </td>
                      <td className="text-right">
                        <Link
                          href={`/admin/clients/${c.user_id}`}
                          className="text-[var(--blue-m)] font-semibold hover:underline"
                        >
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
        </div>
      </main>
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
