import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { getStorage } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const segments = (await ctx.params).path;
  if (!segments?.length) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Prevent path traversal
  if (segments.some((s) => s.includes("..") || s.includes("\\") || s.includes("/"))) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  const storagePath = segments.join("/");
  const storage = await getStorage();

  if (process.env.STORAGE_BACKEND === "supabase") {
    return NextResponse.redirect(storage.publicUrl(storagePath));
  }

  const data = await storage.read(storagePath);
  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const ext = path.extname(storagePath).toLowerCase();
  const type =
    ext === ".png"
      ? "image/png"
      : ext === ".webp"
        ? "image/webp"
        : "image/jpeg";

  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": type,
      "Cache-Control": "public, max-age=86400",
    },
  });
}
