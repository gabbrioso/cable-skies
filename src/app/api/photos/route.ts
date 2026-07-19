import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getStorage } from "@/lib/storage";
import { processPhotoUpload } from "@/lib/photos/process";
import { serializePhoto } from "@/lib/photos/serialize";
import { isAdminAuthed } from "@/lib/admin/auth";
import {
  ARCHIVE_FULL_CODE,
  getMaxPhotos,
  isArchiveFullError,
} from "@/lib/photos/archive";
import { NOT_SKY_CODE } from "@/lib/density/sky-photo";
import type { PhotoStatus } from "@/lib/types";

export const runtime = "nodejs";

function archiveFullResponse() {
  return NextResponse.json(
    {
      code: ARCHIVE_FULL_CODE,
      error:
        "The photo archive is full. Thank you for participating in Cable Skies.",
    },
    { status: 507 },
  );
}

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
  try {
    const db = await getDb();
    const existing = await db.listPhotos("all");
    if (existing.length >= getMaxPhotos()) {
      return archiveFullResponse();
    }

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

    if (result.code === ARCHIVE_FULL_CODE || result.error === ARCHIVE_FULL_CODE) {
      return archiveFullResponse();
    }

    if (result.code === NOT_SKY_CODE) {
      return NextResponse.json(
        { code: NOT_SKY_CODE, error: result.error },
        { status: 422 },
      );
    }

    if (result.needsPin) {
      return NextResponse.json(
        { needsPin: true, error: result.error },
        { status: 422 },
      );
    }

    if (result.error || !result.photo) {
      if (isArchiveFullError(result.error)) {
        return archiveFullResponse();
      }
      return NextResponse.json(
        {
          error: result.error || "Upload failed",
          ...(result.code ? { code: result.code } : {}),
        },
        { status: 400 },
      );
    }

    const storage = await getStorage();
    return NextResponse.json({
      photo: serializePhoto(result.photo, storage),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (isArchiveFullError(message)) {
      return archiveFullResponse();
    }
    console.error("POST /api/photos", err);
    return NextResponse.json(
      { error: "Upload failed — please try again." },
      { status: 500 },
    );
  }
}
