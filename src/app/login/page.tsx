import { LoginForm } from "./LoginForm";
import { LoopLogo } from "@/components/LoopLogo";

export default function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  return (
    <main className="min-h-screen grid md:grid-cols-[.9fr_1.1fr] bg-white">
      {/* Colonna sinistra: branding */}
      <section className="hidden md:flex relative items-center justify-center brand-gradient text-white p-12 overflow-hidden">
        <div className="relative z-10 max-w-sm">
          <div className="flex items-center gap-3 mb-8">
            <LoopLogo size={44} variant="light" />
          </div>
          <div className="text-xs tracking-widest opacity-70 mb-4">
            SISTEMA LOOP
          </div>
          <h2 className="text-4xl font-bold mb-4 leading-tight">
            Arbitraggio matematico su XAUUSD
          </h2>
          <p className="text-white/80 leading-relaxed">
            Un percorso guidato passo-passo per mettere in operatività il sistema
            a rischio zero. 6 moduli video, checklist operativa, supporto diretto.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-4 text-center">
            <Stat n="6" label="Moduli" />
            <Stat n="~90m" label="Durata" />
            <Stat n="0€" label="Costo" />
          </div>
        </div>
        <div className="absolute -top-24 -left-24 w-[420px] h-[420px] rounded-full bg-blue-500/20 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-[420px] h-[420px] rounded-full bg-blue-300/10 blur-3xl" />
      </section>

      {/* Colonna destra: form */}
      <section className="flex items-center justify-center p-8 md:p-16">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-3 mb-10">
            <LoopLogo size={44} />
            <div className="pl-3 border-l border-paper-border">
              <div className="text-xs tracking-widest text-ink-muted uppercase">
                Area Tutorial
              </div>
              <div className="text-sm font-semibold text-ink">
                Onboarding Cliente
              </div>
            </div>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold text-ink mb-2">
            Accedi all&apos;area riservata
          </h1>
          <p className="text-ink-muted mb-8">
            Inserisci le credenziali ricevute via email per iniziare il tuo
            percorso di onboarding.
          </p>

          <LoginForm nextParam={searchParams} />

          <p className="mt-8 text-xs text-ink-muted">
            Servizio gratuito di assistenza tecnica LOOP — nessuna vendita, nessuna
            commissione. Per accesso, contatta{" "}
            
              className="text-blue-m font-medium hover:underline"
              href="mailto:luca@lucadigioia.ch"
            >
              luca@lucadigioia.ch
            </a>
            .
          </p>
        </div>
      </section>
    </main>
  );
}

function Stat({ n, label }: { n: string; label: string }) {
  return (
    <div className="bg-white/10 rounded-xl py-3 backdrop-blur">
      <div className="text-2xl font-bold">{n}</div>
      <div className="text-[11px] tracking-wider opacity-80 mt-1">{label}</div>
    </div>
  );
}
