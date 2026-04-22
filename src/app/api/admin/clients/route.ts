import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

// =====================================================
// POST /api/admin/clients
// Body: { email, firstName?, lastName?, password? }
// Se password non passata, la generiamo noi (12 char).
// Nessuna email da Supabase: account confermato (email_confirm: true).
// =====================================================
export async function POST(req: Request) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: me } = await sb.from("profiles").select("role").eq("id", user.id).single();
  if ((me as { role?: string } | null)?.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as Partial<{
    email: string;
    firstName: string;
    lastName: string;
    password: string;
    // retro-compat: accettiamo ancora fullName se arriva da vecchi client
    fullName: string;
  }>;

  const email = body.email?.trim().toLowerCase();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "email non valida" }, { status: 400 });
  }

  let firstName = body.firstName?.trim() || null;
  let lastName = body.lastName?.trim() || null;
  // Se arriva ancora fullName (vecchio client), proviamo a splittarlo
  if (!firstName && !lastName && body.fullName) {
    const parts = body.fullName.trim().split(/\s+/);
    firstName = parts[0] ?? null;
    lastName = parts.slice(1).join(" ") || null;
  }
  const fullName = [firstName, lastName].filter(Boolean).join(" ") || null;

  // Password: se passata, min 10 caratteri; altrimenti auto-generata
  let password = body.password?.trim();
  if (password) {
    if (password.length < 10) {
      return NextResponse.json(
        { error: "la password deve essere di almeno 10 caratteri" },
        { status: 400 }
      );
    }
  } else {
    password = genTempPassword();
  }

  const admin = createAdminClient();
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // account già confermato → zero email da Supabase
    user_metadata: { full_name: fullName ?? "", role: "client" },
  });
  if (createErr) {
    return NextResponse.json({ error: createErr.message }, { status: 400 });
  }

  // Il trigger handle_new_user ha creato la riga profiles.
  // Settiamo first/last name (il trigger DB terrà in sync full_name).
  await admin
    .from("profiles")
    .update({
      first_name: firstName,
      last_name: lastName,
      full_name: fullName,
    })
    .eq("id", created.user!.id);

  // Log invito (per audit legacy)
  await admin.from("admin_invites").insert({
    email,
    full_name: fullName,
    invited_by: user.id,
    used: true,
    used_at: new Date().toISOString(),
    resulting_user: created.user!.id,
  });

  await logAudit({
    eventType: "client.create",
    targetType: "user",
    targetId: created.user!.id,
    targetLabel: email,
    metadata: { firstName, lastName, via: "admin.new-client" },
  });

  return NextResponse.json({
    ok: true,
    email,
    password,
    userId: created.user!.id,
  });
}

function genTempPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let out = "";
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < 12; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}
