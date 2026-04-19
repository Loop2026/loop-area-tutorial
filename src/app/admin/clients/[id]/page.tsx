import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";
import { computeModuleStates } from "@/lib/modules-state";
import type { ModuleRow, ProgressRow, Profile } from "@/lib/types";

export default async function ClientDetail({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await sb.from("profiles").select("*").eq("id", user.id).single<Profile>();
  if (me?.role !== "admin") redirect("/area");

  const [{ data: client }, { data: modules }, { data: progress }, { data: chkItems }, { data: chkUser }, { data: views }] =
    await Promise.all([
      sb.from("profiles").select("*").eq("id", id).single<Profile>(),
      sb.from("modules").select("*").eq("published", true).order("order_index"),
      sb.from("progress").select("*").eq("user_id", id),
      sb.from("checklist_items").select("*").order("order_index"),
      sb.from("user_checklist").select("*").eq("user_id", id),
      sb.from("video_views").select("*").eq("user_id", id).order("ts", { ascending: false }).limit(30)
    ]);

  if (!client) notFound();

  const states = computeModuleStates((modules ?? []) as ModuleRow[], (progress ?? []) as ProgressRow[]);
  const done = states.filter((m) => m.state === "completed").length;

  return (
    <div className="flex min-h-screen bg-paper-soft">
      <Sidebar role="admin" fullName={me.full_name ?? ""} email={me.email} />
      <main className="flex-1 p-6 md:p-10 max-w-6xl mx-auto w-full">
        <Link href="/admin" className="btn-ghost mb-5">← Dashboard</Link>

        <header className="flex items-start justify-between gap-4 mb-8 flex-wrap">
          <div>
            <div className="text-xs tracking-widest text-blue-m uppercase">Cliente</div>
            <h1 className="text-3xl font-bold text-ink">{client.full_name ?? client.email}</h1>
            <div className="text-ink-muted mt-1">{client.email}</div>
            <div className="text-sm text-ink-muted mt-2">
              Iscritto il {new Date(client.created_at).toLocaleDateString("it-IT")}
              {client.last_login_at && (
                <> • Ultimo login {new Date(client.last_login_at).toLocaleString("it-IT")}</>
              )}
            </div>
          </div>
          <div className="card p-5 min-w-[200px]">
            <div className="text-xs tracking-wider text-ink-muted uppercase">Moduli</div>
            <div className="text-3xl font-bold text-ink mt-1">
              {done}<span className="text-ink-muted text-xl">/{states.length}</span>
            </div>
          </div>
        </header>

        <section className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Progresso moduli */}
          <div className="card p-6">
            <h2 className="font-bold text-ink mb-4">Progresso moduli</h2>
            <ul className="space-y-3">
              {states.map((m) => (
                <li key={m.id} className="flex items-center gap-3">
                  <span className={[
                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                    m.state === "completed"
                      ? "bg-green-500 text-white"
                      : m.state === "in_progress"
                      ? "bg-amber-400 text-white"
                      : "bg-slate-200 text-slate-600"
                  ].join(" ")}>
                    {m.state === "completed" ? "✓" : m.order_index}
                  </span>
                  <span className="text-sm font-medium text-ink flex-1">{m.title}</span>
                  <span className="text-xs text-ink-muted">
                    {m.state === "completed"
                      ? "completato"
                      : m.state === "in_progress"
                      ? `${m.progress?.watched_pct ?? 0}%`
                      : m.state === "locked"
                      ? "bloccato"
                      : "da iniziare"}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Checklist */}
          <div className="card p-6">
            <h2 className="font-bold text-ink mb-4">Checklist onboarding</h2>
            <ul className="space-y-2">
              {(chkItems ?? []).map((it: any) => {
                const row = (chkUser ?? []).find((r: any) => r.item_id === it.id);
                const ok = !!row?.done;
                return (
                  <li key={it.id} className={["flex items-start gap-3 p-2 rounded-lg", ok ? "bg-green-50" : ""].join(" ")}>
                    <span className={[
                      "mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0",
                      ok ? "bg-green-500 border-green-500 text-white" : "border-slate-300"
                    ].join(" ")}>
                      {ok && "✓"}
                    </span>
                    <span className={`text-sm ${ok ? "line-through text-ink-muted" : "text-ink"}`}>
                      {it.title}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        {/* Activity log */}
        <section className="card p-6">
          <h2 className="font-bold text-ink mb-4">Attività recente (video events)</h2>
          {(views ?? []).length === 0 && (
            <p className="text-sm text-ink-muted">Nessuna attività video registrata.</p>
          )}
          <ul className="space-y-2">
            {(views ?? []).map((v: any) => (
              <li key={v.id} className="flex items-center gap-3 text-sm">
                <span className="text-xs font-mono text-blue-m font-semibold w-16 uppercase">
                  {v.event_type}
                </span>
                <span className="font-medium">{v.module_id.toUpperCase()}</span>
                {v.watched_pct != null && (
                  <span className="text-ink-muted">— {v.watched_pct}%</span>
                )}
                <span className="ml-auto text-ink-muted text-xs">
                  {new Date(v.ts).toLocaleString("it-IT")}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
