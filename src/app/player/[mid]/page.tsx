import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { computeModuleStates } from "@/lib/modules-state";
import { BunnyPlayer } from "@/components/BunnyPlayer";
import { PlayerTabs } from "@/components/PlayerTabs";
import { Sidebar } from "@/components/Sidebar";
import type { Chapter, ResourceLink, ModuleRow, ProgressRow, Profile } from "@/lib/types";

export default async function PlayerPage({
  params
}: {
  params: Promise<{ mid: string }>;
}) {
  const { mid } = await params;
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: modules }, { data: progress }] = await Promise.all([
    sb.from("profiles").select("*").eq("id", user.id).single<Profile>(),
    sb.from("modules").select("*").eq("published", true).order("order_index"),
    sb.from("progress").select("*").eq("user_id", user.id)
  ]);

  const states = computeModuleStates((modules ?? []) as ModuleRow[], (progress ?? []) as ProgressRow[]);
  const current = states.find((m) => m.id === mid);
  if (!current) notFound();

  // Guard: modulo bloccato -> rimanda in area
  if (current.state === "locked") redirect("/area?locked=" + mid);

  const idx = states.findIndex((m) => m.id === mid);
  const prev = idx > 0 ? states[idx - 1] : null;
  const next = idx < states.length - 1 ? states[idx + 1] : null;

  const libraryId = process.env.NEXT_PUBLIC_BUNNY_LIBRARY_ID!;
  const videoReady = !!current.bunny_video_id && !!libraryId;

  return (
    <div className="flex min-h-screen bg-paper-soft">
      <Sidebar
        role="client"
        fullName={profile?.full_name ?? ""}
        email={profile?.email ?? user.email!}
      />
      <main className="flex-1 p-6 md:p-10 max-w-6xl mx-auto w-full">
        <Link href="/area" className="btn-ghost mb-5">← Torna all&apos;area</Link>

        <header className="mb-6">
          <div className="text-xs tracking-widest text-blue-m uppercase mb-1">
            Modulo {current.order_index} di {states.length}
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-ink">{current.title}</h1>
          <p className="text-ink-muted mt-2 max-w-3xl">{current.description}</p>
        </header>

        {videoReady ? (
          <BunnyPlayer
            videoId={current.bunny_video_id!}
            libraryId={libraryId}
            moduleId={current.id}
            userId={user.id}
            initialPct={current.progress?.watched_pct ?? 0}
          />
        ) : (
          <div className="rounded-2xl bg-navy text-white p-10 text-center">
            <div className="text-sm opacity-70 tracking-widest uppercase mb-2">
              Video in arrivo
            </div>
            <div className="text-xl font-semibold">
              Questo modulo sarà pubblicato a breve.
            </div>
            <p className="text-white/60 text-sm mt-2">
              Riceverai una notifica appena il video sarà online.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          <div className="md:col-span-2">
            <PlayerTabs
              chapters={(current.chapters ?? []) as Chapter[]}
              resources={(current.resources ?? []) as ResourceLink[]}
              initialNotes={current.progress?.notes ?? ""}
              userId={user.id}
              moduleId={current.id}
            />
          </div>
          <aside className="card p-6 h-fit">
            <h3 className="font-semibold text-ink mb-3">Navigazione</h3>
            <div className="space-y-2">
              {prev && (
                <Link href={`/player/${prev.id}`} className="btn-ghost w-full justify-start">
                  ← {prev.title}
                </Link>
              )}
              {next && next.state !== "locked" && (
                <Link href={`/player/${next.id}`} className="btn-primary w-full justify-between">
                  {next.title} →
                </Link>
              )}
              {next && next.state === "locked" && (
                <div className="text-xs text-ink-muted p-3 rounded-xl bg-paper-soft border border-paper-border">
                  Completa questo modulo per sbloccare <strong>{next.title}</strong>.
                </div>
              )}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
