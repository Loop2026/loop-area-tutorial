import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

// POST /api/admin/clients/[id]/resend-password
// Genera una nuova password temporanea per il cliente e la restituisce in chiaro UNA volta.
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
  if (me?.role !== "admin")
    return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const password = genTempPassword();
  const admin = createAdminClient();

  const { error } = await admin.auth.admin.updateUserById(id, { password });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // log audit (best-effort)
  await admin
    .from("admin_invites")
    .insert({
      email: "(resend)",
      invited_by: user.id,
      used: true,
      used_at: new Date().toISOString(),
      resulting_user: id,
    })
    .select()
    .maybeSingle();

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
