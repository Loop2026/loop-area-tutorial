// =====================================================
// Helper centralizzato per scrivere righe su audit_logs
// =====================================================
// Non bloccare MAI la richiesta principale se la scrittura log fallisce:
// il log è un side-effect, se si rompe vogliamo un console.error e basta.

import { headers } from "next/headers";
import { createAdminClient, createClient } from "@/lib/supabase/server";

export type AuditEventType =
  // Auth
  | "auth.login"
  | "auth.logout"
  | "auth.failed"
  // Admin management
  | "admin.invite"
  | "admin.create"
  | "admin.disable"
  | "admin.enable"
  | "admin.delete"
  | "admin.role_change"
  | "admin.reset_password"
  // Client management
  | "client.create"
  | "client.update"
  | "client.disable"
  | "client.enable"
  | "client.delete"
  | "client.reset_password"
  // Modules
  | "module.create"
  | "module.update"
  | "module.publish"
  | "module.unpublish"
  | "module.delete";

export interface AuditInput {
  eventType: AuditEventType;
  targetType?: "user" | "module" | "system" | string;
  targetId?: string;
  targetLabel?: string;
  metadata?: Record<string, unknown>;
  /** Se non passato, viene letto da Supabase auth. Usa override per eventi di sign-in dove
   * l'utente è appena stato autenticato e l'attore coincide con il target. */
  overrideActor?: { id: string | null; email: string | null; role: string | null };
}

export async function logAudit(input: AuditInput): Promise<void> {
  try {
    // 1. Determina l'attore
    let actorId: string | null = null;
    let actorEmail: string | null = null;
    let actorRole: string | null = null;

    if (input.overrideActor) {
      actorId = input.overrideActor.id;
      actorEmail = input.overrideActor.email;
      actorRole = input.overrideActor.role;
    } else {
      try {
        const sb = await createClient();
        const { data: { user } } = await sb.auth.getUser();
        if (user) {
          actorId = user.id;
          actorEmail = user.email ?? null;
          const { data: prof } = await sb
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();
          actorRole = (prof as { role?: string } | null)?.role ?? null;
        }
      } catch {
        // Se non c'è sessione (es. auth.failed) va bene lasciare tutto null.
      }
    }

    // 2. Estrai IP e user agent dagli headers della request corrente
    let ip: string | null = null;
    let ua: string | null = null;
    try {
      const h = await headers();
      const forwarded = h.get("x-forwarded-for");
      ip = forwarded ? forwarded.split(",")[0]?.trim() ?? null : h.get("x-real-ip");
      ua = h.get("user-agent");
    } catch {
      // headers() può fallire fuori da request scope — tolleriamo.
    }

    // 3. Scrivi il log via service_role (bypassa RLS)
    const admin = createAdminClient();
    const { error } = await admin.from("audit_logs").insert({
      actor_id: actorId,
      actor_email: actorEmail,
      actor_role: actorRole,
      event_type: input.eventType,
      target_type: input.targetType ?? null,
      target_id: input.targetId ?? null,
      target_label: input.targetLabel ?? null,
      metadata: input.metadata ?? {},
      ip_address: ip,
      user_agent: ua,
    });
    if (error) {
      console.error("[audit] insert failed", error.message, {
        event: input.eventType,
      });
    }
  } catch (err) {
    console.error("[audit] unexpected error", err);
  }
}
