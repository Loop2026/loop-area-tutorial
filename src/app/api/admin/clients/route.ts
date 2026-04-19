import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

// POST /api/admin/clients
// Crea un nuovo utente cliente con password temporanea random.
// Richiede SUPABASE_SERVICE_ROLE_KEY (admin SDK).
export async function POST(req: Request) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: me } = await sb.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { email, fullName } = (await req.json().catch(() => ({}))) as {
    email?: string;
    fullName?: string;
  };
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "email non valida" }, { status: 400 });
  }

  // Password temporanea: 12 char alfanumerici
  const password = genTempPassword();

  const admin = createAdminClient();
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // saltiamo verifica email — è un invito assistito
    user_metadata: { full_name: fullName ?? "", role: "client" }
  });
  if (createErr) {
    return NextResponse.json({ error: createErr.message }, { status: 400 });
  }

  // Il trigger handle_new_user ha già creato la riga in profiles.
  // Ma aggiorniamo full_name se non impostato dal trigger.
  if (fullName) {
    await admin.from("profiles")
      .update({ full_name: fullName })
      .eq("id", created.user!.id);
  }

  // Log invito (per audit)
  await admin.from("admin_invites").insert({
    email,
    full_name: fullName ?? null,
    invited_by: user.id,
    used: true,
    used_at: new Date().toISOString(),
    resulting_user: created.user!.id
  });

  return NextResponse.json({
    ok: true,
    email,
    password,
    userId: created.user!.id
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
