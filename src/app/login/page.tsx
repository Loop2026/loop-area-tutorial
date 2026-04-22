import { LoginForm } from "./LoginForm";
import { LoopLogo } from "@/components/LoopLogo";

export default function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  return (
    <main className="min-h-screen grid md:grid-cols-[1.1fr_.9fr] bg-white">
      {/* Colonna sinistra: branding (1.1fr) */}
      <section className="login-art hidden md:flex">
        <div className="brand flex-col items-start gap-2">
          <LoopLogo size={28} variant="light" />
        </div>

        <div className="art-copy">
          <div className="art-kicker">
            <span className="dot" />
            ACCESSO RISERVATO
          </div>
          <h1>
            Il tuo percorso <em>operativo</em> inizia qui.
          </h1>
          <p>
            Sei videocorsi, una dashboard operativa e il supporto del nostro team.
            Accedi con le credenziali fornite dal team LOOP dopo l&apos;attivazione
            del tuo contratto.
          </p>
        </div>

        <div className="art-foot">
          <span>
            <strong>6</strong>
            <small>video tutorial</small>
          </span>
          <span>
            <strong>24/7</strong>
            <small>accesso riservato</small>
          </span>
        </div>
      </section>

      {/* Colonna destra: form (.9fr) */}
      <section className="login-form">
        <div className="w-full max-w-md mx-auto">
          {/* Logo mobile (visibile solo < md) */}
          <div className="md:hidden mb-8 flex justify-center">
            <LoopLogo size={28} />
          </div>

          <div className="form-head">
            <span className="eyebrow">Accedi</span>
            <h2>Benvenuto nell&apos;Area Tutorial</h2>
            <p>
              Seleziona il tipo di accesso, poi inserisci le credenziali fornite
              dal team LOOP. Se hai problemi, rispondiamo entro 24 ore lavorative.
            </p>
          </div>

          <LoginForm nextParam={searchParams} />

          <div className="mfa-note mt-6">
            <div className="d" />
            <small>
              <b>Servizio gratuito di assistenza tecnica LOOP.</b> Nessuna
              vendita, nessuna commissione. Per richiedere un accesso scrivi a{" "}
              <a
                className="text-blue-m font-semibold hover:underline"
                href="mailto:support@loop-online.com"
              >
                support@loop-online.com
              </a>
              .
            </small>
          </div>
        </div>
      </section>
    </main>
  );
}
