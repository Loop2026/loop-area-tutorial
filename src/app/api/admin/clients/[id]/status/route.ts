import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

// POST /api/admin/clients/[id]/status
// Body: { status: "active" | "disabled" }
// Aggiorna profiles.status. Se "disabled" banna anche il login Supabase.
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: me } = await sb
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (me?.role !== "admin")
    return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as { status?: string };
  if (body.status !== "active" && body.status !== "disabled") {
    return NextResponse.json({ error: "status non valido" }, { status: 400 });
  }

  const admin = createAdminClient();

  // 1) aggiorno profiles.status
  const { error: pErr } = await admin
    .from("profiles")
    .update({ status: body.status })
    .eq("id", id);
  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 400 });

  // 2) ban/unban su Supabase Auth per impedire login se sospeso
  const banDuration = body.status === "disabled" ? "876000h" : "none";
  const { error: aErr } = await admin.auth.admin.updateUserById(id, {
    ban_duration: banDuration,
  });
  if (aErr) {
    // rollback profiles
    await admin
      .from("profiles")
      .update({ status: body.status === "disabled" ? "active" : "disabled" })
      .eq("id", id);
    return NextResponse.json({ error: aErr.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, status: body.status });
}
