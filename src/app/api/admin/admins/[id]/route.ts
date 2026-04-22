import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

// =====================================================
// PATCH /api/admin/admins/[id]
// Body: { action: "disable" | "enable" | "demote" }
//   disable → ban 100 anni + profiles.status='disabled'
//   enable  → un-ban + profiles.status='active'
//   demote  → role='client' (revoca privilegi admin)
// =====================================================
export async function PATCH(
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
  if ((me as { role?: string } | null)?.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Anti self-lockout: non puoi disabilitare/demotere te stesso
  if (id === user.id) {
    return NextResponse.json(
      { error: "non puoi modificare il tuo stesso account da qui" },
      { status: 400 }
    );
  }

  const body = (await req.json().catch(() => ({}))) as Partial<{
    action: "disable" | "enable" | "demote";
  }>;

  const admin = createAdminClient();

  // Fetch profilo target per log
  const { data: target } = await admin
    .from("profiles")
    .select("email, role, status")
    .eq("id", id)
    .single();
  const targetEmail = (target as { email?: string } | null)?.email ?? undefined;

  if (body.action === "disable") {
    const { error: banErr } = await admin.auth.admin.updateUserById(id, {
      ban_duration: "876000h", // ~100 anni
    });
    if (banErr) return NextResponse.json({ error: banErr.message }, { status: 400 });

    await admin.from("profiles").update({ status: "disabled" }).eq("id", id);

    await logAudit({
      eventType: "admin.disable",
      targetType: "user",
      targetId: id,
      targetLabel: targetEmail,
    });
    return NextResponse.json({ ok: true, action: "disable" });
  }

  if (body.action === "enable") {
    const { error: unbanErr } = await admin.auth.admin.updateUserById(id, {
      ban_duration: "none",
    });
    if (unbanErr) return NextResponse.json({ error: unbanErr.message }, { status: 400 });

    await admin.from("profiles").update({ status: "active" }).eq("id", id);

    await logAudit({
      eventType: "admin.enable",
      targetType: "user",
      targetId: id,
      targetLabel: targetEmail,
    });
    return NextResponse.json({ ok: true, action: "enable" });
  }

  if (body.action === "demote") {
    await admin.from("profiles").update({ role: "client" }).eq("id", id);

    await logAudit({
      eventType: "admin.role_change",
      targetType: "user",
      targetId: id,
      targetLabel: targetEmail,
      metadata: { from: "admin", to: "client" },
    });
    return NextResponse.json({ ok: true, action: "demote" });
  }

  return NextResponse.json({ error: "action non valida" }, { status: 400 });
}

// =====================================================
// DELETE /api/admin/admins/[id]
// Rimuove l'utente da auth.users. Il profilo e i dati
// collegati cadono via ON DELETE CASCADE se configurato.
// =====================================================
export async function DELETE(
  _req: Request,
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
  if ((me as { role?: string } | null)?.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  if (id === user.id) {
    return NextResponse.json(
      { error: "non puoi eliminare il tuo stesso account" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // Log pre-delete così conserviamo email anche se l'utente viene rimosso
  const { data: target } = await admin
    .from("profiles")
    .select("email")
    .eq("id", id)
    .single();

  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await logAudit({
    eventType: "admin.delete",
    targetType: "user",
    targetId: id,
    targetLabel: (target as { email?: string } | null)?.email ?? undefined,
  });

  return NextResponse.json({ ok: true });
}
