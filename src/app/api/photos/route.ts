import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getStorage } from "@/lib/storage";
import { processPhotoUpload } from "@/lib/photos/process";
import { serializePhoto } from "@/lib/photos/serialize";
import { isAdminAuthed } from "@/lib/admin/auth";
import type { PhotoStatus } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const statusParam = req.nextUrl.searchParams.get("status") || "approved";
  let status: PhotoStatus | "all" = "approved";

  if (statusParam === "all" || statusParam === "pending" || statusParam === "rejected") {
    if (!(await isAdminAuthed())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    status = statusParam;
  } else if (statusParam === "approved") {
    status = "approved";
  }

  const db = await getDb();
  const storage = await getStorage();
  const photos = await db.listPhotos(status);

  return NextResponse.json({
    photos: photos.map((p) => serializePhoto(p, storage)),
  });
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const noteRaw = (form.get("note") as string | null)?.trim() || "";
  const placeRaw = (form.get("placeName") as string | null)?.trim() || "";
  const note = noteRaw || null;
  const placeName = placeRaw || null;
  const latRaw = form.get("lat");
  const lngRaw = form.get("lng");
  const lat =
    typeof latRaw === "string" && latRaw !== "" ? Number(latRaw) : null;
  const lng =
    typeof lngRaw === "string" && lngRaw !== "" ? Number(lngRaw) : null;

  const result = await processPhotoUpload({
    filename: file.name,
    mime: file.type,
    buffer,
    source: "upload",
    lat: Number.isFinite(lat) ? lat : null,
    lng: Number.isFinite(lng) ? lng : null,
    note,
    placeName,
  });

  if (result.needsPin) {
    return NextResponse.json(
      { needsPin: true, error: result.error },
      { status: 422 },
    );
  }

  if (result.error || !result.photo) {
    return NextResponse.json(
      { error: result.error || "Upload failed" },
      { status: 400 },
    );
  }

  const storage = await getStorage();
  return NextResponse.json({
    photo: serializePhoto(result.photo, storage),
  });
}
