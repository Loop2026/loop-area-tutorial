import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

// POST /api/admin/upload
// FormData multipart: { file: File, folder?: string }
// Carica nel bucket Storage 'resources' e restituisce { url, path, size, contentType }.
export async function POST(req: Request) {
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

  const fd = await req.formData().catch(() => null);
  if (!fd) return NextResponse.json({ error: "form data mancante" }, { status: 400 });

  const file = fd.get("file");
  const folder = String(fd.get("folder") ?? "general").replace(/[^a-z0-9_/-]/gi, "");
  if (!(file instanceof File))
    return NextResponse.json({ error: "file mancante" }, { status: 400 });

  if (file.size > 100 * 1024 * 1024) {
    return NextResponse.json({ error: "file > 100MB" }, { status: 400 });
  }

  const admin = createAdminClient();

  const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const stamp = Date.now().toString(36);
  const path = `${folder}/${stamp}-${cleanName}`;

  const buf = await file.arrayBuffer();

  const { error: upErr } = await admin.storage
    .from("resources")
    .upload(path, buf, {
      contentType: file.type || "application/octet-stream",
      cacheControl: "31536000",
      upsert: false,
    });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 400 });

  const { data: pub } = admin.storage.from("resources").getPublicUrl(path);

  return NextResponse.json({
    ok: true,
    url: pub.publicUrl,
    path,
    size: file.size,
    contentType: file.type,
    name: cleanName,
  });
}
