import Link from "next/link";
import { LoopLogo } from "./LoopLogo";

interface Props {
  fullName: string;
  email: string;
  active?: "clients" | "modules" | "new";
}

/**
 * Topbar navy condivisa per tutte le pagine /admin.
 * Stessa estetica della topbar di /area, con nav admin.
 */
export function AdminTopbar({ fullName, email, active }: Props) {
  const display = fullName || email;
  return (
    <header className="topbar">
      <div className="brand flex items-center gap-3">
        <LoopLogo size={32} variant="light" />
        <span className="admin-badge">ADMIN</span>
      </div>
      <nav>
        <Link href="/admin" className={active === "clients" ? "active" : ""}>
          Clienti
        </Link>
        <Link href="/admin/modules" className={active === "modules" ? "active" : ""}>
          Moduli
        </Link>
        <Link
          href="/admin/new-client"
          className={active === "new" ? "active" : ""}
        >
          Nuovo cliente
        </Link>
        <Link href="/area" className="back-link">
          ← Area Tutorial
        </Link>
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
  );
}

function shortName(s: string) {
  const parts = s.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0]} ${parts[1][0]}.`;
  return parts[0] || s;
}
function initials(s: string) {
  const parts = s.split(/[\s@.]+/).filter(Boolean);
  return (parts[0]?.[0] ?? "?").toUpperCase() + (parts[1]?.[0] ?? "").toUpperCase();
}
