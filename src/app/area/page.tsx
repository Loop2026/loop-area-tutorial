import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { computeModuleStates } from "@/lib/modules-state";
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
  const pct        = total ? Math.round((done / total) * 100) : 0;

  const watchedMin = states
    .filter((s) => s.state === "completed")
    .reduce((acc, s) => acc + parseDuration(s.duration), 0);

  const chkDone  = (chkUser ?? []).filter((c) => c.done).length;
  const chkTotal = (chkItems ?? []).length;

  const fullName = profile?.full_name ?? "";
  const email    = profile?.email ?? user.email ?? "";
  const display  = fullName || email;

  // step corrente per la kicker
  const stepNumber = Math.min(done + 1, total || 1);

  return (
    <div className="min-h-screen bg-[var(--off)]">
      {/* ============ TOPBAR navy con nav orizzontale ============ */}
      <header className="topbar">
        <div className="brand">
          <LoopLogo size={32} variant="light" />
        </div>
        <nav>
          <a href="/area" className="active">Tutorial</a>
          <a href="#checklist">Checklist</a>
          <a href="mailto:support@loop-online.com?subject=Supporto%20Area%20Tutorial%20LOOP">Supporto</a>
          {profile?.role === "admin" && (
            <a href="/admin" className="admin-link">Admin</a>
          )}
        </nav>
        <div className="flex items-center gap-3">
          <div className="user-chip">
            <small>{shortName(display)}</small>
            <div className="av">{initials(display)}</div>
          </div>
          <form action="/api/auth/logout" method="post">
            <button
              type="submit"
              className="text-[12px] text-white/65 hover:text-white px-3 py-2 rounded-full border border-white/10 hover:border-white/30 transition"
              aria-label="Logout"
            >
              Esci
            </button>
          </form>
        </div>
      </header>

      {/* ============ HERO grande con grid pattern ============ */}
      <section id="progress" className="hero-big">
        <div className="wrap">
          <div className="eyebrow">
            <span className="d" />
            ONBOARDING · STEP {stepNumber} DI {total || 6}
          </div>
          <h1>
            Benvenuto nell&apos;<em>Area Tutorial</em>.
          </h1>
          <p>
            Hai completato {done} {done === 1 ? "modulo" : "moduli"} su {total || 6}.
            Ora ti guidiamo passo dopo passo attraverso il metodo, il software, il
            broker, la challenge e la dashboard operativa.
          </p>

          <div className="progress-bar mt-8">
            <span style={{ width: `${pct}%` }} />
          </div>
          <div className="p-label">
            <span>Progresso onboarding</span>
            <b>{pct}% · {done} / {total || 6} moduli completati</b>
          </div>
        </div>
      </section>

      {/* ============ CONTENT che si sovrappone ============ */}
      <div className="area-content">
        {/* KPI row */}
        <div className="kpis">
          <div className="kpi">
            <div className="kpi-h">
              <div className="kpi-l">Moduli completati</div>
              <div className="kpi-i"><IconStack /></div>
            </div>
            <div className="kpi-v">{done} / {total || 6}</div>
            <div className="kpi-d">
              {done === total && total > 0
                ? "Tutti completati 🎉"
                : `${(total || 6) - done} rimasti`}
            </div>
          </div>

          <div className="kpi">
            <div className="kpi-h">
              <div className="kpi-l">In corso</div>
              <div className="kpi-i"><IconPlay /></div>
            </div>
            <div className="kpi-v">{inProgress}</div>
            <div className="kpi-d">
              {inProgress ? "Continua dove hai lasciato" : "Nessun modulo aperto"}
            </div>
          </div>

          <div className="kpi">
            <div className="kpi-h">
              <div className="kpi-l">Bloccati</div>
              <div className="kpi-i"><IconLock /></div>
            </div>
            <div className="kpi-v">{locked}</div>
            <div className="kpi-d">Sbloccabili in sequenza</div>
          </div>

          <div className="kpi">
            <div className="kpi-h">
              <div className="kpi-l">Tempo fruito</div>
              <div className="kpi-i"><IconClock /></div>
            </div>
            <div className="kpi-v">{watchedMin}m</div>
            <div className="kpi-d">Basato sui moduli completati</div>
          </div>
        </div>

        {/* Sezione moduli */}
        <section className="mb-12">
          <header className="section-head">
            <div>
              <small>I tuoi moduli</small>
              <h2>Percorso operativo</h2>
              <p>
                Segui l&apos;ordine: ogni modulo si sblocca al completamento del
                precedente.
              </p>
            </div>
            <div className="hidden md:flex items-center gap-2">
              <span className="badge badge-info">
                <span className="dot dot-success" /> Sbloccati {(total || 0) - locked}
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
        <section id="checklist" className="mb-12">
          <header className="section-head">
            <div>
              <small>Setup operativo</small>
              <h2>Checklist</h2>
              <p>
                Completa i {chkTotal} step per essere pronto a usare il sistema LOOP
                in autonomia ({chkDone}/{chkTotal} fatti).
              </p>
            </div>
          </header>
          <Checklist
            items={(chkItems ?? []) as ChecklistItem[]}
            userChecklist={(chkUser ?? []) as UserChecklistRow[]}
            userId={user.id}
          />
        </section>

        {/* Support */}
        <section
          id="support"
          className="bg-white border border-[var(--border)] rounded-xl p-7 md:p-9 flex flex-col md:flex-row md:items-center md:justify-between gap-5"
        >
          <div>
            <div className="text-[11px] font-bold tracking-[.16em] uppercase text-[var(--blue-m)] mb-2">
              Hai bisogno di aiuto?
            </div>
            <h3 className="text-xl font-bold text-ink mb-1">
              Servizio gratuito di assistenza tecnica LOOP
            </h3>
            <p className="text-[14px] text-[var(--mid)] leading-relaxed">
              Nessuna vendita, nessuna commissione. Risposta entro 24 ore lavorative.
            </p>
          </div>
          <a href="mailto:support@loop-online.com?subject=Supporto%20Area%20Tutorial%20LOOP" className="btn btn-primary">
            Scrivi al supporto
          </a>
        </section>
      </div>
    </div>
  );
}

/* -------- utils -------- */
function shortName(s: string) {
  const parts = s.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0]} ${parts[1][0]}.`;
  return parts[0] || s;
}
function initials(s: string) {
  const parts = s.split(/[\s@.]+/).filter(Boolean);
  return (parts[0]?.[0] ?? "?").toUpperCase() + (parts[1]?.[0] ?? "").toUpperCase();
}
function parseDuration(d: string): number {
  const [m = "0"] = (d || "").split(":");
  return parseInt(m, 10) || 0;
}

/* -------- icone -------- */
function IconStack() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2 2 7l10 5 10-5-10-5Z"/><path d="m2 17 10 5 10-5M2 12l10 5 10-5"/></svg>; }
function IconPlay()  { return <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>; }
function IconLock()  { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 1 1 8 0v4"/></svg>; }
function IconClock() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>; }
