import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

// Forza Node.js runtime: serve `node:crypto` per timingSafeEqual.
export const runtime = "nodejs";

// =====================================================
// POST /api/webhook/crea-utente
// Endpoint webhook protetto da header `x-webhook-secret`.
//
// Body:
//   {
//     email:     "mario.rossi@email.com",
//     firstName: "Mario",     // opzionale
//     lastName:  "Rossi",     // opzionale
//     password:  "Kp4mRvNqT2"
//   }
//
// Risposte:
//   200 → { ok: true, created: true|false, userId, ... }
//         created=false significa che l'utente esisteva già
//         (idempotenza: nessun errore se richiamato due volte).
//   400 → body / email / password invalidi.
//   401 → segreto sbagliato o assente.
//   500 → WEBHOOK_SECRET non configurato lato server.
//
// La password viene passata in chiaro all'admin SDK Supabase,
// che internamente la hasha con bcrypt prima di salvarla in
// `auth.users.encrypted_password`. NON pre-hashiamo: lo farebbe
// due volte e l'utente non potrebbe più loggarsi.
// =====================================================
export async function POST(req: Request) {
  // 1. Verifica segreto (timing-safe)
  const expected = process.env.WEBHOOK_SECRET;
  if (!expected) {
    console.error("[webhook/crea-utente] WEBHOOK_SECRET non configurato");
    return NextResponse.json(
      { error: "webhook non configurato" },
      { status: 500 }
    );
  }
  const provided = req.headers.get("x-webhook-secret") ?? "";
  if (!safeEqual(provided, expected)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // 2. Parse body
  const body = (await req.json().catch(() => null)) as Partial<{
    email: string;
    firstName: string;
    lastName: string;
    password: string;
  }> | null;

  if (!body) {
    return NextResponse.json({ error: "body non valido" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "email non valida" }, { status: 400 });
  }

  const password = body.password?.trim();
  if (!password || password.length < 8) {
    return NextResponse.json(
      { error: "password mancante o troppo corta (min 8 caratteri)" },
      { status: 400 }
    );
  }

  const firstName = body.firstName?.trim() || null;
  const lastName = body.lastName?.trim() || null;
  const fullName = [firstName, lastName].filter(Boolean).join(" ") || null;

  const admin = createAdminClient();

  // 3. Idempotenza: cerca per email su profiles
  const { data: existing } = await admin
    .from("profiles")
    .select("id, email")
    .eq("email", email)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({
      ok: true,
      created: false,
      userId: (existing as { id: string }).id,
      message: "utente già esistente, nessuna azione",
    });
  }

  // 4. Crea utente — Supabase hasha la password con bcrypt
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // niente email di conferma
    user_metadata: { full_name: fullName ?? "", role: "client" },
  });

  if (createErr) {
    // Race condition o utente presente solo in auth.users (non in profiles):
    // trattiamo come idempotenza.
    const msg = createErr.message?.toLowerCase() ?? "";
    if (msg.includes("already") || msg.includes("registered") || msg.includes("duplicate")) {
      return NextResponse.json({
        ok: true,
        created: false,
        message: "utente già esistente",
      });
    }
    console.error("[webhook/crea-utente] createUser error", createErr.message);
    return NextResponse.json({ error: createErr.message }, { status: 400 });
  }

  // 5. Aggiorna profilo (il trigger DB tiene full_name in sync)
  await admin
    .from("profiles")
    .update({
      first_name: firstName,
      last_name: lastName,
      full_name: fullName,
    })
    .eq("id", created.user!.id);

  // 6. Audit log — actor = sistema/webhook
  await logAudit({
    eventType: "client.create",
    targetType: "user",
    targetId: created.user!.id,
    targetLabel: email,
    metadata: { firstName, lastName, via: "webhook.crea-utente" },
    overrideActor: { id: null, email: "webhook", role: "system" },
  });

  return NextResponse.json({
    ok: true,
    created: true,
    userId: created.user!.id,
    email,
  });
}

// Confronto a tempo costante per evitare timing attacks sul segreto.
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ab.length !== bb.length) return false;
  try {
    return timingSafeEqual(ab, bb);
  } catch {
    return false;
  }
}
