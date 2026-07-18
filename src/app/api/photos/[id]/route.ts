import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getStorage } from "@/lib/storage";
import { serializePhoto } from "@/lib/photos/serialize";
import { isAdminAuthed } from "@/lib/admin/auth";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const db = await getDb();
  const storage = await getStorage();
  const photo = await db.getPhoto(id);
  if (!photo || photo.status !== "approved") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({
    photo: serializePhoto(photo, storage),
  });
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const db = await getDb();
  const storage = await getStorage();
  const photo = await db.getPhoto(id);
  if (!photo) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await storage.remove(photo.storagePath);
  await storage.remove(photo.thumbPath);
  if (photo.ditherPath) await storage.remove(photo.ditherPath);
  await db.deletePhoto(id);
  return NextResponse.json({ ok: true });
}
