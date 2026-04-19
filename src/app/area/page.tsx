import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { computeModuleStates } from "@/lib/modules-state";
import { Sidebar } from "@/components/Sidebar";
import { ModuleCard } from "@/components/ModuleCard";
import { Checklist } from "@/components/Checklist";
import { LoopLogo } from "@/components/LoopLogo";
import type {
  ModuleRow, ProgressRow, ChecklistItem, UserChecklistRow, Profile
} from "@/lib/types";

export default async function AreaPage() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");

  const [
    { data: profile },
    { data: modules },
    { data: progress },
    { data: chkItems },
    { data: chkUser }
  ] = await Promise.all([
    sb.from("profiles").select("*").eq("id", user.id).single<Profile>(),
    sb.from("modules").select("*").eq("published", true).order("order_index"),
    sb.from("progress").select("*").eq("user_id", user.id),
    sb.from("checklist_items").select("*").order("order_index"),
    sb.from("user_checklist").select("*").eq("user_id", user.id)
  ]);

  const states = computeModuleStates(
    (modules ?? []) as ModuleRow[],
    (progress ?? []) as ProgressRow[]
  );

  const total      = states.length;
  const done       = states.filter((s) => s.state === "completed").length;
  const inProgress = states.filter((s) => s.state === "in_progress").length;
  const locked     = states.filter((s) => s.state === "locked").length;
  const pct        = Math.round((done / Math.max(total, 1)) * 100);

  // ore totali stimate dai moduli completati
  const watchedMin = states
    .filter((s) => s.state === "completed")
    .reduce((acc, s) => acc + parseDuration(s.duration), 0);

  const chkDone = (chkUser ?? []).filter((c) => c.done).length;
  const chkTotal = (chkItems ?? []).length;

  return (
    <div className="flex min-h-screen">
      <Sidebar
        role="client"
        fullName={profile?.full_name ?? ""}
        email={profile?.email ?? user.email!}
        counters={[{ href: "/area", value: total - done }]}
      />

      <main className="flex-1 min-w-0">
        {/* Topbar */}
        <div className="topbar">
          <div className="flex items-center gap-3 min-w-0">
            <div className="brand-mini">
              <LoopLogo size={28} />
            </div>
            <div className="crumbs truncate">
              <strong>Area Tutorial</strong>
              <span className="hidden sm:inline">&nbsp;/ Dashboard</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="badge badge-success">
              <span className="dot dot-success" /> Online
            </span>
            <span className="hidden sm:inline text-xs text-ink-muted mono">
              {new Date().toLocaleDateString("it-IT", {
                weekday: "short", day: "numeric", month: "short"
              })}
            </span>
          </div>
        </div>

        <div className="p-6 md:p-8 max-w-[1180px] mx-auto w-full">
          {/* Hero */}
          <section id="progress" className="hero">
            <div className="hero-grid">
              <div>
                <div className="text-[11px] font-semibold text-blue-xl uppercase tracking-[.14em] mb-2">
                  Benvenuto
                </div>
                <h1>Ciao {firstName(profile?.full_name ?? profile?.email ?? "")}</h1>
                <p className="hero-sub">
                  Completa i <strong className="text-white">{total} moduli video</strong> e
                  la <strong className="text-white">checklist operativa</strong> per
                  essere pronto a usare il sistema LOOP in autonomia.
                </p>
                <div className="mt-5 max-w-[320px]">
                  <div className="progress-bar on-dark">
                    <span style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex items-center justify-between mt-2 text-[11px] uppercase tracking-[.14em] text-blue-xl">
                    <span>Percorso</span>
                    <span className="mono text-white">{pct}%</span>
                  </div>
                </div>
              </div>

              <div className="hero-stat">
                <div className="lbl">Moduli completati</div>
                <div className="val">
                  {done}<span className="text-blue-xl">/{total}</span>
                </div>
                <div className="hint">
                  {done === total ? "Tutti completati 🎉" : `${total - done} rimasti`}
                </div>
              </div>

              <div className="hero-stat">
                <div className="lbl">Checklist operativa</div>
                <div className="val">
                  {chkDone}<span className="text-blue-xl">/{chkTotal}</span>
                </div>
                <div className={`hint ${chkDone < chkTotal ? "warn" : ""}`}>
                  {chkDone === chkTotal ? "Setup completo" : "Da completare"}
                </div>
              </div>
            </div>
          </section>

          {/* KPI */}
          <section className="kpis">
            <Kpi
              label="Moduli totali"
              value={String(total)}
              detail="Percorso strutturato in 6 step"
              icon={<IconStack />}
            />
            <Kpi
              label="In corso"
              value={String(inProgress)}
              detail={inProgress ? "Continua dove hai lasciato" : "Nessun modulo aperto"}
              icon={<IconPlay />}
            />
            <Kpi
              label="Bloccati"
              value={String(locked)}
              detail="Sbloccabili in sequenza"
              icon={<IconLock />}
            />
            <Kpi
              label="Tempo fruito"
              value={`${watchedMin}m`}
              detail="Basato sui moduli completati"
              icon={<IconClock />}
            />
          </section>

          {/* Moduli */}
          <section className="mb-10">
            <header className="flex items-end justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-ink">I tuoi moduli</h2>
                <p className="text-sm text-ink-muted">
                  Segui l&apos;ordine: ogni modulo si sblocca al completamento del precedente.
                </p>
              </div>
              <div className="hidden md:flex items-center gap-2">
                <span className="badge badge-info">
                  <span className="dot dot-success" /> Sbloccati {total - locked}
                </span>
                <span className="badge badge-muted">
                  <span className="dot dot-muted" /> Bloccati {locked}
                </span>
              </div>
            </header>

            <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {states.map((m) => <ModuleCard key={m.id} m={m} />)}
            </div>
          </section>

          {/* Checklist */}
          <section id="checklist">
            <Checklist
              items={(chkItems ?? []) as ChecklistItem[]}
              userChecklist={(chkUser ?? []) as UserChecklistRow[]}
              userId={user.id}
            />
          </section>
        </div>
      </main>
    </div>
  );
}

/* -------- KPI mini component -------- */
function Kpi({
  label, value, detail, icon
}: {
  label: string; value: string; detail: string; icon: React.ReactNode;
}) {
  return (
    <div className="kpi">
      <div className="kpi-h">
        <div className="kpi-l">{label}</div>
        <div className="kpi-i">{icon}</div>
      </div>
      <div className="kpi-v">{value}</div>
      <div className="kpi-d">{detail}</div>
    </div>
  );
}

/* -------- utils -------- */
function firstName(s: string) {
  return (s.split(" ")[0] || s.split("@")[0] || "").trim();
}
function parseDuration(d: string): number {
  // "12:40" → 12
  const [m = "0"] = (d || "").split(":");
  return parseInt(m, 10) || 0;
}

/* -------- icone -------- */
function IconStack() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2 2 7l10 5 10-5-10-5Z"/><path d="m2 17 10 5 10-5M2 12l10 5 10-5"/></svg>; }
function IconPlay()  { return <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>; }
function IconLock()  { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 1 1 8 0v4"/></svg>; }
function IconClock() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>; }
