import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminTopbar } from "@/components/AdminTopbar";
import type { ModuleRow, Profile } from "@/lib/types";

export default async function AdminModules() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await sb
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();
  if (me?.role !== "admin") redirect("/area");

  const { data: modules } = await sb
    .from("modules")
    .select("*")
    .order("order_index");

  const rows = (modules ?? []) as ModuleRow[];

  return (
    <div className="min-h-screen bg-[var(--off)]">
      <AdminTopbar
        fullName={me.full_name ?? ""}
        email={me.email}
        active="modules"
      />

      <div className="admin-page">
        <header className="mb-8">
          <div className="admin-eyebrow">
            <span className="d" />
            ADMIN · MODULI
          </div>
          <h1 className="admin-h1">
            Gestione <em>moduli</em>.
          </h1>
          <p className="text-[15px] text-[var(--ink-slate)] mt-2 max-w-2xl">
            Per ogni modulo puoi configurare il video (Bunny ID), i capitoli
            e le risorse PDF/Excel collegate. Le modifiche sono visibili
            subito ai clienti.
          </p>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {rows.map((m) => {
            const hasVideo = !!m.bunny_video_id;
            const resCount = (m.resources ?? []).length;
            const chapCount = (m.chapters ?? []).length;
            return (
              <Link
                key={m.id}
                href={`/admin/modules/${m.id}`}
                className="a-panel block hover:shadow-md transition-shadow"
              >
                <div className="a-panel-b">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-mono font-bold text-[var(--blue-m)] tracking-widest uppercase">
                      {m.id} · {m.duration}
                    </span>
                    {m.published ? (
                      <span className="pill pill-ok">
                        <span className="d" />
                        Pubblicato
                      </span>
                    ) : (
                      <span className="pill pill-off">
                        <span className="d" />
                        Bozza
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-[var(--navy)] text-lg leading-tight mb-2">
                    {m.title}
                  </h3>
                  <p className="text-sm text-[var(--ink-slate)] line-clamp-2 mb-4">
                    {m.description}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-[var(--ink-slate)] flex-wrap">
                    <span
                      className={
                        hasVideo
                          ? "text-emerald-700 font-semibold"
                          : "text-amber-700 font-semibold"
                      }
                    >
                      {hasVideo ? "● Video collegato" : "○ Nessun video"}
                    </span>
                    <span>•</span>
                    <span>{chapCount} capitoli</span>
                    <span>•</span>
                    <span>{resCount} risorse</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </section>

        {rows.length === 0 && (
          <div className="text-center text-[var(--ink-slate)] py-12">
            Nessun modulo. Devono essere stati seedati nel database.
          </div>
        )}
      </div>
    </div>
  );
}
