import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminTopbar } from "@/components/AdminTopbar";
import { ModuleEditor } from "./ModuleEditor";
import type { ModuleRow, Profile } from "@/lib/types";

export default async function AdminModuleEdit({
  params,
}: {
  params: Promise<{ mid: string }>;
}) {
  const { mid } = await params;
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await sb
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();
  if (me?.role !== "admin") redirect("/area");

  const { data: mod } = await sb
    .from("modules")
    .select("*")
    .eq("id", mid)
    .single<ModuleRow>();
  if (!mod) notFound();

  return (
    <div className="min-h-screen bg-[var(--off)]">
      <AdminTopbar
        fullName={me.full_name ?? ""}
        email={me.email}
        active="modules"
      />

      <div className="admin-page" style={{ maxWidth: 960 }}>
        <Link
          href="/admin/modules"
          className="text-sm text-[var(--ink-slate)] hover:text-[var(--ink)] mb-6 inline-block"
        >
          ← Tutti i moduli
        </Link>

        <header className="mb-7">
          <div className="admin-eyebrow">
            <span className="d" />
            ADMIN · MODULO {mod.id.toUpperCase()}
          </div>
          <h1 className="admin-h1">{mod.title}</h1>
          <p className="text-[15px] text-[var(--ink-slate)] mt-2">
            {mod.description}
          </p>
        </header>

        <ModuleEditor module={mod} />
      </div>
    </div>
  );
}
