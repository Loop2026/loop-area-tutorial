import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

// =====================================================
// POST /api/admin/admins/[id]/reset-password
// Genera una nuova password temporanea per l'admin indicato
// e la restituisce in chiaro UNA volta. Nessuna email inviata.
// =====================================================
export async function POST(
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

  const admin = createAdminClient();
  const password = genTempPassword();

  const { error } = await admin.auth.admin.updateUserById(id, { password });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const { data: target } = await admin
    .from("profiles")
    .select("email")
    .eq("id", id)
    .single();

  await logAudit({
    eventType: "admin.reset_password",
    targetType: "user",
    targetId: id,
    targetLabel: (target as { email?: string } | null)?.email ?? undefined,
  });

  return NextResponse.json({ ok: true, password });
}

function genTempPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let out = "";
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < 12; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}
