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
    .select("id, email, full_name, role, status, created_at, last_login_at")
    .eq("role", "admin")
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ admins: rows ?? [] });
}

// =====================================================
// POST /api/admin/admins
// Body:
//   { mode: "invite", email, fullName? }                   → inviteUserByEmail
//   { mode: "create", email, password, fullName? }         → createUser direct
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
    mode: "invite" | "create";
    email: string;
    password: string;
    fullName: string;
  }>;

  const email = body.email?.trim().toLowerCase();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "email non valida" }, { status: 400 });
  }

  const fullName = body.fullName?.trim() || null;
  const admin = createAdminClient();

  // ====== modalità INVITE ======
  if (body.mode === "invite") {
    const origin = new URL(req.url).origin;
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { full_name: fullName ?? "", role: "admin" },
      redirectTo: `${origin}/login`,
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const newUserId = data.user?.id;
    if (newUserId) {
      // Promuovi il profilo appena creato a ruolo admin
      await admin
        .from("profiles")
        .update({ role: "admin", full_name: fullName })
        .eq("id", newUserId);
    }

    await logAudit({
      eventType: "admin.invite",
      targetType: "user",
      targetId: newUserId ?? null as unknown as string,
      targetLabel: email,
      metadata: { fullName, mode: "invite" },
    });

    return NextResponse.json({ ok: true, mode: "invite", email });
  }

  // ====== modalità CREATE ======
  if (body.mode === "create") {
    const password = body.password?.trim() || "";
    if (password.length < 10) {
      return NextResponse.json(
        { error: "la password deve avere almeno 10 caratteri" },
        { status: 400 }
      );
    }

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName ?? "", role: "admin" },
    });
    if (createErr) {
      return NextResponse.json({ error: createErr.message }, { status: 400 });
    }

    // Imposta ruolo admin (il trigger handle_new_user crea con 'client' di default)
    await admin
      .from("profiles")
      .update({ role: "admin", full_name: fullName, status: "active" })
      .eq("id", created.user!.id);

    await logAudit({
      eventType: "admin.create",
      targetType: "user",
      targetId: created.user!.id,
      targetLabel: email,
      metadata: { fullName, mode: "create" },
    });

    return NextResponse.json({
      ok: true,
      mode: "create",
      email,
      userId: created.user!.id,
    });
  }

  return NextResponse.json({ error: "mode non valido" }, { status: 400 });
}
