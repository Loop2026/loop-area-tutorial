import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

// =====================================================
// DELETE /api/admin/clients/[id]
// Rimuove il cliente da auth.users. Le righe collegate
// (profiles, progress, user_checklist, ecc.) cadono via
// ON DELETE CASCADE.
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

  // Log pre-delete: conserviamo email e ruolo pre-rimozione
  const { data: target } = await admin
    .from("profiles")
    .select("email, role")
    .eq("id", id)
    .single();

  // Evita abusi: non usare questo endpoint per eliminare admin
  if ((target as { role?: string } | null)?.role === "admin") {
    return NextResponse.json(
      { error: "questo endpoint è riservato ai client" },
      { status: 400 }
    );
  }

  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await logAudit({
    eventType: "client.delete",
    targetType: "user",
    targetId: id,
    targetLabel: (target as { email?: string } | null)?.email ?? undefined,
  });

  return NextResponse.json({ ok: true });
}
