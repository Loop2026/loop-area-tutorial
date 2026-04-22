import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

// =====================================================
// POST /api/auth/event
// Endpoint chiamato dal client dopo un tentativo di login.
// Body: { type: "login" | "failed", email?: string }
//  - "login":   login riuscito — leggiamo l'utente dalla sessione corrente
//  - "failed":  login fallito — l'attore è anonimo, salviamo l'email tentata
// =====================================================
export async function POST(req: Request) {
  let body: { type?: string; email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const type = body.type;
  const attemptedEmail = typeof body.email === "string" ? body.email.trim() : undefined;

  if (type !== "login" && type !== "failed") {
    return NextResponse.json({ error: "invalid type" }, { status: 400 });
  }

  if (type === "login") {
    // Richiede sessione valida: leggiamo l'utente e registriamo auth.login.
    const sb = await createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "no session" }, { status: 401 });
    }
    const { data: prof } = await sb
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    const role = (prof as { role?: string } | null)?.role ?? null;

    await logAudit({
      eventType: "auth.login",
      targetType: "user",
      targetId: user.id,
      targetLabel: user.email ?? undefined,
      overrideActor: { id: user.id, email: user.email ?? null, role },
    });
    return NextResponse.json({ ok: true });
  }

  // type === "failed": nessuna sessione, l'attore è anonimo.
  // Se abbiamo un'email tentata la usiamo come target label per poter
  // filtrare i tentativi ripetuti sullo stesso account.
  let targetId: string | undefined;
  if (attemptedEmail) {
    try {
      // Se l'email esiste nel sistema, teniamo il suo UUID come target
      // (così l'admin può incrociare i tentativi falliti con utenti reali).
      const admin = createAdminClient();
      const { data: existing } = await admin
        .from("profiles")
        .select("id")
        .eq("email", attemptedEmail)
        .maybeSingle();
      targetId = (existing as { id?: string } | null)?.id;
    } catch {
      // tolleriamo — non vogliamo bloccare un log di tentativo fallito
    }
  }

  await logAudit({
    eventType: "auth.failed",
    targetType: attemptedEmail ? "user" : "system",
    targetId,
    targetLabel: attemptedEmail,
    overrideActor: { id: null, email: null, role: null },
  });

  return NextResponse.json({ ok: true });
}
