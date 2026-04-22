import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

export async function POST(req: Request) {
  const sb = await createClient();

  // Cattura attore PRIMA del signOut (dopo non c'è più sessione)
  let actorId: string | null = null;
  let actorEmail: string | null = null;
  let actorRole: string | null = null;
  try {
    const { data: { user } } = await sb.auth.getUser();
    if (user) {
      actorId = user.id;
      actorEmail = user.email ?? null;
      const { data: prof } = await sb
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      actorRole = (prof as { role?: string } | null)?.role ?? null;
    }
  } catch {
    // ignoriamo: se non c'è sessione il logout resta comunque idempotente
  }

  if (actorId) {
    await logAudit({
      eventType: "auth.logout",
      targetType: "user",
      targetId: actorId,
      targetLabel: actorEmail ?? undefined,
      overrideActor: { id: actorId, email: actorEmail, role: actorRole },
    });
  }

  await sb.auth.signOut();
  return NextResponse.redirect(new URL("/login", req.url), { status: 303 });
}
