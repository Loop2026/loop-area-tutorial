import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

// =====================================================
// GET /api/admin/logs
// Query: ?event=auth.login&actor=uuid&q=text&from=iso&to=iso&page=1&limit=50
// =====================================================
export async function GET(req: Request) {
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

  const url = new URL(req.url);
  const event = url.searchParams.get("event")?.trim() || null;
  const actor = url.searchParams.get("actor")?.trim() || null;
  const q = url.searchParams.get("q")?.trim() || null;
  const from = url.searchParams.get("from")?.trim() || null;
  const to = url.searchParams.get("to")?.trim() || null;
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const limit = Math.min(200, Math.max(10, Number(url.searchParams.get("limit")) || 50));

  const admin = createAdminClient();
  let query = admin
    .from("audit_logs")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  if (event) query = query.eq("event_type", event);
  if (actor) query = query.eq("actor_id", actor);
  if (q) {
    // OR tra actor_email, target_label
    query = query.or(
      `actor_email.ilike.%${q}%,target_label.ilike.%${q}%,target_id.ilike.%${q}%`
    );
  }
  if (from) query = query.gte("created_at", from);
  if (to) query = query.lte("created_at", to);

  const offset = (page - 1) * limit;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({
    logs: data ?? [],
    page,
    limit,
    total: count ?? 0,
  });
}
