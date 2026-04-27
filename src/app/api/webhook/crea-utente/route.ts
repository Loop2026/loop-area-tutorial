import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

// Forza Node.js runtime per node:crypto.timingSafeEqual
export const runtime = "nodejs";

// =====================================================
// Webhook crea-utente — TOLLERANTE a vari stili di chiamata
//
// Accetta:
//   - METODO: POST oppure GET
//   - SECRET: header `x-webhook-secret` oppure query param `secret`
//             oppure query param `webhook_secret`
//   - DATI:   body JSON oppure query string (?email=...&password=...)
//             body in JSON ha precedenza, query riempie i campi mancanti
//   - PASSWORD: testo in chiaro (Supabase la hasha con bcrypt)
//               OPPURE hash bcrypt già pronto (`$2a$10$...`,
//               `$2b$...`, `$2y$...`) → la inseriamo direttamente in
//               auth.users.encrypted_password senza re-hashare
//
// La logica di idempotenza è la stessa: se l'email esiste già su
// profiles, ritorniamo 200 con created=false.
// =====================================================

export async function POST(req: Request) {
  return handle(req, "POST");
}

export async function GET(req: Request) {
  return handle(req, "GET");
}

async function handle(req: Request, method: "GET" | "POST") {
  // ---------- 1. Verifica secret ----------
  const expected = process.env.WEBHOOK_SECRET;
  if (!expected) {
    console.error("[webhook/crea-utente] WEBHOOK_SECRET non configurato");
    return NextResponse.json(
      { error: "webhook non configurato" },
      { status: 500 }
    );
  }

  const url = new URL(req.url);
  const provided =
    req.headers.get("x-webhook-secret") ??
    url.searchParams.get("secret") ??
    url.searchParams.get("webhook_secret") ??
    "";

  if (!safeEqual(provided, expected)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // ---------- 2. Lettura input (body OPPURE query string) ----------
  type Input = Partial<{
    email: string;
    firstName: string;
    first_name: string;
    lastName: string;
    last_name: string;
    password: string;
    password_hash: string;
  }>;

  const input: Input = {};

  // Tenta body JSON (POST tipicamente, ma anche GET se presente)
  const ct = req.headers.get("content-type") ?? "";
  if (ct.toLowerCase().includes("application/json")) {
    try {
      const text = await req.text();
      if (text.trim()) {
        Object.assign(input, JSON.parse(text) as Input);
      }
    } catch {
      // body malformato → si ricade su query string
    }
  }

  // Riempi i campi mancanti dalla query string
  for (const [k, v] of url.searchParams.entries()) {
    if (k === "secret" || k === "webhook_secret") continue;
    if ((input as Record<string, string | undefined>)[k] === undefined) {
      (input as Record<string, string>)[k] = v;
    }
  }

  // ---------- 3. Validazione campi ----------
  const email = (input.email ?? "").trim().toLowerCase();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "email non valida" }, { status: 400 });
  }

  const passwordRaw = (input.password ?? input.password_hash ?? "").trim();
  if (!passwordRaw || passwordRaw.length < 8) {
    return NextResponse.json(
      { error: "password mancante o troppo corta (min 8 caratteri)" },
      { status: 400 }
    );
  }

  const firstName =
    (input.firstName ?? input.first_name ?? "").trim() || null;
  const lastName = (input.lastName ?? input.last_name ?? "").trim() || null;
  const fullName = [firstName, lastName].filter(Boolean).join(" ") || null;

  const isBcryptHash = isBcrypt(passwordRaw);

  // ---------- 4. Idempotenza ----------
  const admin = createAdminClient();

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

  // ---------- 5. Creazione utente ----------
  // Se la password è già un bcrypt hash, creiamo l'utente con una password
  // temporanea casuale e poi sovrascriviamo l'hash via SQL.
  // Altrimenti flusso standard (Supabase fa il bcrypt).
  const passwordForCreation = isBcryptHash
    ? generateTempPassword(20)
    : passwordRaw;

  const { data: created, error: createErr } =
    await admin.auth.admin.createUser({
      email,
      password: passwordForCreation,
      email_confirm: true,
      user_metadata: { full_name: fullName ?? "", role: "client" },
    });

  if (createErr) {
    const msg = createErr.message?.toLowerCase() ?? "";
    if (
      msg.includes("already") ||
      msg.includes("registered") ||
      msg.includes("duplicate")
    ) {
      return NextResponse.json({
        ok: true,
        created: false,
        message: "utente già esistente",
      });
    }
    console.error("[webhook/crea-utente] createUser error", createErr.message);
    return NextResponse.json({ error: createErr.message }, { status: 400 });
  }

  const newUserId = created.user!.id;

  // Se la password era pre-hashata, sovrascrivi encrypted_password
  if (isBcryptHash) {
    const { error: pwErr } = await admin.rpc(
      "webhook_set_user_password_hash",
      { p_user_id: newUserId, p_hash: passwordRaw }
    );
    if (pwErr) {
      console.error(
        "[webhook/crea-utente] set_user_password_hash error",
        pwErr.message
      );
      // Non blocchiamo la creazione: l'utente esiste con la temp password,
      // l'admin può sempre resettarla da /admin/clients. Loghiamo l'errore
      // così appare in Vercel logs.
    }
  }

  // ---------- 6. Aggiorna profilo ----------
  await admin
    .from("profiles")
    .update({
      first_name: firstName,
      last_name: lastName,
      full_name: fullName,
    })
    .eq("id", newUserId);

  // ---------- 7. Audit log ----------
  await logAudit({
    eventType: "client.create",
    targetType: "user",
    targetId: newUserId,
    targetLabel: email,
    metadata: {
      firstName,
      lastName,
      via: "webhook.crea-utente",
      method,
      passwordPreHashed: isBcryptHash,
    },
    overrideActor: { id: null, email: "webhook", role: "system" },
  });

  return NextResponse.json({
    ok: true,
    created: true,
    userId: newUserId,
    email,
  });
}

// =====================================================
// Helpers
// =====================================================

function isBcrypt(s: string): boolean {
  // Formato bcrypt standard: $2a$, $2b$, $2y$ + cost a 2 cifre +
  // 22 char di salt + 31 char di hash (totale 53 dopo l'ultimo $)
  return /^\$2[aby]\$\d{2}\$[A-Za-z0-9./]{53}$/.test(s);
}

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

function generateTempPassword(n = 16): string {
  const alphabet =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const bytes = new Uint8Array(n);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < n; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}
