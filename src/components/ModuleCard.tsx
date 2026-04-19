import Link from "next/link";
import type { ModuleWithProgress } from "@/lib/types";

export function ModuleCard({ m }: { m: ModuleWithProgress }) {
  const locked = m.state === "locked";
  const done   = m.state === "completed";
  const inProg = m.state === "in_progress";
  const pct    = done ? 100 : (m.progress?.watched_pct ?? 0);

  const badge = done
    ? { cls: "badge-success", text: "Completato" }
    : inProg
    ? { cls: "badge-info",    text: `${pct}%` }
    : locked
    ? { cls: "badge-locked",  text: "Bloccato" }
    : { cls: "badge-info",    text: "Disponibile" };

  const body = (
    <article
      className={[
        "mod-card h-full",
        locked && "opacity-60 cursor-not-allowed pointer-events-none"
      ].filter(Boolean).join(" ")}
      aria-disabled={locked}
    >
      <div className="mod-thumb">
        <span className="idx">MOD {String(m.order_index).padStart(2, "0")}</span>
        <div className="play" aria-hidden>
          {locked ? <IconLock /> : <IconPlay />}
        </div>
        <span className="dur">{m.duration}</span>
      </div>

      <div className="mod-body">
        <div className="flex items-center justify-between gap-2">
          <span className="badge badge-muted">{m.level}</span>
          <span className={`badge ${badge.cls}`}>{badge.text}</span>
        </div>

        <h3 className="mod-title">{m.title}</h3>
        <p className="mod-desc line-clamp-3">{m.description}</p>

        <div className="mt-1">
          <div className="progress-bar">
            <span style={{ width: `${pct}%` }} />
          </div>
          <div className="mod-meta mt-2">
            <span className="mono">{pct}%</span>
            <span>
              {done ? "Modulo completato"
                : inProg ? "In corso"
                : locked ? "Completa il precedente"
                : "Inizia ora →"}
            </span>
          </div>
        </div>
      </div>
    </article>
  );

  if (locked) return body;
  return (
    <Link href={`/player/${m.id}`} className="block no-underline">
      {body}
    </Link>
  );
}

function IconPlay() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}
function IconLock() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="4" y="11" width="16" height="10" rx="2"/>
      <path d="M8 11V7a4 4 0 1 1 8 0v4"/>
    </svg>
  );
}
