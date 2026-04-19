import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { moduleId, watchedPct, done, notes } = body as {
    moduleId?: string;
    watchedPct?: number;
    done?: boolean;
    notes?: string;
  };
  if (!moduleId) return NextResponse.json({ error: "moduleId required" }, { status: 400 });

  const payload: any = {
    user_id: user.id,
    module_id: moduleId,
    updated_at: new Date().toISOString()
  };
  if (typeof watchedPct === "number") payload.watched_pct = Math.min(100, Math.max(0, Math.round(watchedPct)));
  if (typeof done === "boolean") {
    payload.done = done;
    if (done) payload.completed_at = new Date().toISOString();
  }
  if (typeof notes === "string") payload.notes = notes;

  const { error } = await sb.from("progress").upsert(payload, { onConflict: "user_id,module_id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
