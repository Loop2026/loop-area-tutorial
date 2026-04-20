import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminTopbar } from "@/components/AdminTopbar";
import { ClientActions } from "./ClientActions";
import { computeModuleStates } from "@/lib/modules-state";
import type {
  ModuleRow,
  ProgressRow,
  Profile,
  ChecklistItem,
  UserChecklistRow,
} from "@/lib/types";

interface VideoView {
  id: string;
  user_id: string;
  module_id: string;
  event_type: string;
  watched_pct: number | null;
  ts: string;
}

export default async function ClientDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await sb
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();
  if (me?.role !== "admin") redirect("/area");

  const [
    { data: client },
    { data: modules },
    { data: progress },
    { data: chkItems },
    { data: chkUser },
    { data: views },
  ] = await Promise.all([
    sb.from("profiles").select("*").eq("id", id).single<Profile>(),
    sb.from("modules").select("*").eq("published", true).order("order_index"),
    sb.from("progress").select("*").eq("user_id", id),
    sb.from("checklist_items").select("*").order("order_index"),
    sb.from("user_checklist").select("*").eq("user_id", id),
    sb
      .from("video_views")
      .select("*")
      .eq("user_id", id)
      .order("ts", { ascending: false })
      .limit(30),
  ]);

  if (!client) notFound();

  const states = computeModuleStates(
    (modules ?? []) as ModuleRow[],
    (progress ?? []) as ProgressRow[]
  );
  const done = states.filter((m) => m.state === "completed").length;
  const status = client.status ?? "active";

  return (
    <div className="min-h-screen bg-[var(--off)]">
      <AdminTopbar
        fullName={me.full_name ?? ""}
        email={me.email}
        active="clients"
      />

      <div className="admin-page">
        <Link
          href="/admin"
          className="text-sm text-[var(--ink-slate)] hover:text-[var(--ink)] mb-6 inline-block"
        >
          ← Panoramica clienti
        </Link>

        <header className="flex items-start justify-between gap-6 mb-8 flex-wrap">
          <div>
            <div className="admin-eyebrow">
              <span className="d" />
              CLIENTE
            </div>
            <h1 className="admin-h1">
              {client.full_name ?? client.email}
            </h1>
            <div className="text-[15px] text-[var(--ink-slate)] mt-2 flex items-center gap-3 flex-wrap">
              <span>{client.email}</span>
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
            </div>
            <div className="text-sm text-[var(--ink-slate)] mt-3">
              Iscritto il{" "}
              {new Date(client.created_at).toLocaleDateString("it-IT")}
              {client.last_login_at && (
                <>
                  {" "}
                  • Ultimo login{" "}
                  {new Date(client.last_login_at).toLocaleString("it-IT")}
                </>
              )}
            </div>
          </div>
          <div className="a-kpi min-w-[180px]">
            <div className="lbl">Moduli</div>
            <div className="val">
              {done}
              <span className="text-[var(--ink-slate)] text-xl font-normal">
                /{states.length}
              </span>
            </div>
            <div className="sub">completati</div>
          </div>
        </header>

        {/* Actions */}
        <ClientActions
          clientId={id}
          clientEmail={client.email}
          clientName={client.full_name ?? ""}
          initialStatus={status}
        />

        <section className="grid md:grid-cols-2 gap-6 mb-8 mt-8">
          {/* Progresso moduli */}
          <div className="a-panel">
            <div className="a-panel-h">
              <h2>Progresso moduli</h2>
              <span className="meta">{states.length} moduli</span>
            </div>
            <div className="a-panel-b">
              <ul className="space-y-3">
                {states.map((m) => (
                  <li key={m.id} className="flex items-center gap-3">
                    <span
                      className={[
                        "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0",
                        m.state === "completed"
                          ? "bg-emerald-500 text-white"
                          : m.state === "in_progress"
                          ? "bg-amber-400 text-white"
                          : "bg-slate-200 text-slate-600",
                      ].join(" ")}
                    >
                      {m.state === "completed" ? "✓" : m.order_index}
                    </span>
                    <span className="text-sm font-semibold text-[var(--ink)] flex-1">
                      {m.title}
                    </span>
                    <span className="text-xs text-[var(--ink-slate)]">
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
          </div>

          {/* Checklist */}
          <div className="a-panel">
            <div className="a-panel-h">
              <h2>Checklist onboarding</h2>
              <span className="meta">
                {(chkUser ?? []).filter((r: UserChecklistRow) => r.done).length}
                /{(chkItems ?? []).length}
              </span>
            </div>
            <div className="a-panel-b">
              <ul className="space-y-2">
                {((chkItems ?? []) as ChecklistItem[]).map((it) => {
                  const row = ((chkUser ?? []) as UserChecklistRow[]).find(
                    (r) => r.item_id === it.id
                  );
                  const ok = !!row?.done;
                  return (
                    <li
                      key={it.id}
                      className={[
                        "flex items-start gap-3 p-2 rounded-lg",
                        ok ? "bg-emerald-50" : "",
                      ].join(" ")}
                    >
                      <span
                        className={[
                          "mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0",
                          ok
                            ? "bg-emerald-500 border-emerald-500 text-white"
                            : "border-slate-300",
                        ].join(" ")}
                      >
                        {ok && "✓"}
                      </span>
                      <span
                        className={`text-sm ${
                          ok
                            ? "line-through text-[var(--ink-slate)]"
                            : "text-[var(--ink)]"
                        }`}
                      >
                        {it.title}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </section>

        {/* Activity log */}
        <section className="a-panel">
          <div className="a-panel-h">
            <h2>Attività recente (video events)</h2>
            <span className="meta">{(views ?? []).length}</span>
          </div>
          <div className="a-panel-b">
            {(views ?? []).length === 0 && (
              <p className="text-sm text-[var(--ink-slate)]">
                Nessuna attività video registrata.
              </p>
            )}
            <ul className="space-y-2">
              {((views ?? []) as VideoView[]).map((v) => (
                <li
                  key={v.id}
                  className="flex items-center gap-3 text-sm py-1 border-b border-[var(--border)] last:border-0"
                >
                  <span className="text-xs font-mono text-[var(--blue-m)] font-semibold w-20 uppercase">
                    {v.event_type}
                  </span>
                  <span className="font-medium text-[var(--ink)]">
                    {v.module_id.toUpperCase()}
                  </span>
                  {v.watched_pct != null && (
                    <span className="text-[var(--ink-slate)]">
                      — {v.watched_pct}%
                    </span>
                  )}
                  <span className="ml-auto text-[var(--ink-slate)] text-xs">
                    {new Date(v.ts).toLocaleString("it-IT")}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
