import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

// =====================================================
// GET /api/admin/admins
// Lista tutti gli utenti con role='admin'
// =====================================================
export async function GET() {
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
  const { data: rows, error } = await admin
    .from("profiles")
    .select("id, email, full_name, first_name, last_name, role, status, created_at, last_login_at")
    .eq("role", "admin")
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ admins: rows ?? [] });
}

// =====================================================
// POST /api/admin/admins
// Body: { email, firstName?, lastName?, password? }
// Se password non viene passata, la generiamo noi.
// Nessuna email inviata da Supabase — l'admin che crea
// comunica manualmente le credenziali al destinatario.
// =====================================================
export async function POST(req: Request) {
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

  const body = (await req.json().catch(() => ({}))) as Partial<{
    email: string;
    firstName: string;
    lastName: string;
    password: string;
  }>;

  const email = body.email?.trim().toLowerCase();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "email non valida" }, { status: 400 });
  }

  const firstName = body.firstName?.trim() || null;
  const lastName = body.lastName?.trim() || null;
  const fullName = [firstName, lastName].filter(Boolean).join(" ") || null;

  // Password: se passata dev'essere >= 10 caratteri, altrimenti la generiamo noi
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
    user_metadata: { full_name: fullName ?? "", role: "admin" },
  });
  if (createErr) {
    return NextResponse.json({ error: createErr.message }, { status: 400 });
  }

  // Il trigger handle_new_user crea profili con role='client' di default.
  // Promuoviamo subito ad admin e settiamo first/last name.
  await admin
    .from("profiles")
    .update({
      role: "admin",
      first_name: firstName,
      last_name: lastName,
      full_name: fullName,
      status: "active",
    })
    .eq("id", created.user!.id);

  await logAudit({
    eventType: "admin.create",
    targetType: "user",
    targetId: created.user!.id,
    targetLabel: email,
    metadata: { firstName, lastName },
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
