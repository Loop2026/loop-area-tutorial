import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import type { Chapter, ResourceLink } from "@/lib/types";

// PATCH /api/admin/modules/[mid]
// Body: { bunny_video_id?: string | null, published?: boolean, chapters?: Chapter[], resources?: ResourceLink[] }
export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ mid: string }> }
) {
  const { mid } = await ctx.params;
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: me } = await sb
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (me?.role !== "admin")
    return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as Partial<{
    bunny_video_id: string | null;
    published: boolean;
    chapters: Chapter[];
    resources: ResourceLink[];
  }>;

  const patch: Record<string, unknown> = {};

  if ("bunny_video_id" in body) {
    patch.bunny_video_id = body.bunny_video_id || null;
  }
  if ("published" in body) {
    patch.published = !!body.published;
  }
  if (Array.isArray(body.chapters)) {
    patch.chapters = body.chapters
      .filter((c) => c && typeof c.title === "string")
      .map((c) => ({
        time: Number(c.time) || 0,
        title: String(c.title).slice(0, 120),
      }));
  }
  if (Array.isArray(body.resources)) {
    const allowed = new Set(["pdf", "xlsx", "link", "checklist"]);
    patch.resources = body.resources
      .filter(
        (r) =>
          r &&
          typeof r.title === "string" &&
          typeof r.url === "string" &&
          allowed.has(r.type)
      )
      .map((r) => ({
        type: r.type,
        title: String(r.title).slice(0, 160),
        url: String(r.url).slice(0, 2000),
      }));
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: true, noop: true });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("modules")
    .update(patch)
    .eq("id", mid)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true, module: data });
}
