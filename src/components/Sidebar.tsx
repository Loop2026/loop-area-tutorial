"use client";

import Link from "next/link";
import { useEffect, useState, type ReactElement } from "react";
import { LoopLogo } from "./LoopLogo";
import { usePathname } from "next/navigation";

interface Props {
  role: "client" | "admin";
  fullName: string;
  email: string;
  /** badges opzionali — es. count moduli da completare, clienti nuovi, etc. */
  counters?: { href: string; value: number | string }[];
}

export function Sidebar({ role, fullName, email, counters = [] }: Props) {
  const path = usePathname() || "";
  const isAdmin = role === "admin";
  const [open, setOpen] = useState(false);

  // Chiudi drawer su cambio pagina
  useEffect(() => {
    setOpen(false);
  }, [path]);

  // Blocca scroll body quando drawer aperto
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  type Item = {
    href: string;
    label: string;
    icon: (p: any) => ReactElement;
    section?: string;
  };

  const items: Item[] = isAdmin
    ? [
        { section: "Panoramica", href: "/admin",           label: "Dashboard",      icon: IconHome     },
        { section: "Clienti",    href: "/admin/clients",    label: "Lista clienti",  icon: IconUsers    },
        {                        href: "/admin/new-client", label: "Nuovo cliente",  icon: IconPlus     },
        { section: "Sistema",    href: "/admin/admins",     label: "Amministratori", icon: IconShield   },
        {                        href: "/admin/logs",       label: "Log",            icon: IconClipboard},
        {                        href: "/admin/settings",   label: "Impostazioni",   icon: IconCog      }
      ]
    : [
        { section: "Il tuo percorso", href: "/area",            label: "Area Corso",   icon: IconHome  },
        {                             href: "/area#progress",   label: "Progresso",    icon: IconChart },
        {                             href: "/area#checklist",  label: "Checklist",    icon: IconCheck },
        { section: "Supporto",        href: "/area#support",    label: "Assistenza",   icon: IconLife  }
      ];

  const sidebarContent = (
    <>
      <div className="brand">
        <LoopLogo size={34} variant="light" />
        <div className="brand-sub">
          {isAdmin ? "Admin Console" : "Area Tutorial"}
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 flex flex-col">
        {items.map((it, idx) => {
          const prevSection = items[idx - 1]?.section;
          const showSection = it.section && it.section !== prevSection;
          const Icon = it.icon;

          const active = it.href === "/area"
            ? path === "/area"
            : it.href === "/admin"
              ? path === "/admin"
              : path.startsWith(it.href);

          const counter = counters.find((c) => c.href === it.href)?.value;

          return (
            <div key={it.href}>
              {showSection && <div className="nav-section">{it.section}</div>}
              <Link
                href={it.href}
                className={["nav-link", active && "active"].filter(Boolean).join(" ")}
                onClick={() => setOpen(false)}
              >
                <span className="ico"><Icon className="w-[18px] h-[18px]" /></span>
                <span>{it.label}</span>
                {counter !== undefined && <span className="count">{counter}</span>}
              </Link>
            </div>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-blue-m text-white flex items-center justify-center text-xs font-bold">
            {initials(fullName || email)}
          </div>
          <div className="min-w-0">
            <div className="text-[13px] font-semibold text-white truncate">
              {fullName || email}
            </div>
            <div className="text-[11px] text-white/60 truncate">{email}</div>
          </div>
        </div>
        <form action="/api/auth/logout" method="post" className="mt-3">
          <button
            type="submit"
            className="w-full text-xs py-2 rounded-lg bg-white/5 hover:bg-white/10 transition text-white/80"
          >
            Logout
          </button>
        </form>
      </div>
    </>
  );

  return (
    <>
      {/* Hamburger toggle — visibile solo mobile */}
      <button
        type="button"
        className="md:hidden fixed top-3 left-3 z-50 w-10 h-10 rounded-lg bg-ink text-white flex items-center justify-center shadow-lg"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Chiudi menu" : "Apri menu"}
      >
        {open ? <IconClose className="w-5 h-5" /> : <IconMenu className="w-5 h-5" />}
      </button>

      {/* Overlay — sotto la sidebar, sopra il contenuto */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-30 bg-black/50 backdrop-blur-sm"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar desktop — sempre visibile md+ */}
      <aside className="app-sidebar hidden md:flex">
        {sidebarContent}
      </aside>

      {/* Sidebar mobile — drawer off-canvas */}
      <aside
        className={[
          "app-sidebar md:hidden fixed inset-y-0 left-0 z-40 flex transition-transform duration-200 ease-out",
          open ? "translate-x-0" : "-translate-x-full"
        ].join(" ")}
        aria-hidden={!open}
      >
        {sidebarContent}
      </aside>
    </>
  );
}

function initials(s: string) {
  const parts = s.split(/[\s@.]+/).filter(Boolean);
  return (parts[0]?.[0] ?? "?").toUpperCase() + (parts[1]?.[0] ?? "").toUpperCase();
}

/* --- icone SVG inline --- */
function IconHome(p: any)      { return <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11 12 3l9 8v10a1 1 0 0 1-1 1h-5v-7H10v7H5a1 1 0 0 1-2-1V11Z"/></svg>; }
function IconUsers(p: any)     { return <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0"/><circle cx="17" cy="7" r="3"/><path d="M22 19a5 5 0 0 0-5-5"/></svg>; }
function IconPlus(p: any)      { return <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>; }
function IconCheck(p: any)     { return <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M9 12l2 2 4-4"/></svg>; }
function IconChart(p: any)     { return <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M7 15l4-6 4 4 5-8"/></svg>; }
function IconCog(p: any)       { return <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/></svg>; }
function IconLife(p: any)      { return <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><path d="M4.93 4.93l4.24 4.24M14.83 14.83l4.24 4.24M14.83 9.17l4.24-4.24M4.93 19.07l4.24-4.24"/></svg>; }
function IconShield(p: any)    { return <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2 4 5v6c0 5 3.5 9.5 8 11 4.5-1.5 8-6 8-11V5l-8-3Z"/><path d="m9 12 2 2 4-4"/></svg>; }
function IconClipboard(p: any) { return <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4h6v3H9zM8 11h8M8 15h8M8 19h5"/></svg>; }
function IconMenu(p: any)      { return <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>; }
function IconClose(p: any)     { return <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>; }
