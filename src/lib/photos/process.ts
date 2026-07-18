import { nanoid } from "nanoid";
import { scoreDensity } from "@/lib/density/score";
import { extractGps } from "@/lib/exif/extract";
import { makeThumb, toJpegBuffer } from "@/lib/images/convert";
import { makeDither, makeDitherThumb } from "@/lib/images/dither";
import { resolvePlaceFields } from "@/lib/geo/place";
import { getDb } from "@/lib/db";
import { getStorage } from "@/lib/storage";
import type { Photo, PhotoSource, PhotoStatus } from "@/lib/types";

const MAX_BYTES = 20 * 1024 * 1024;

export interface ProcessOptions {
  filename: string;
  mime?: string | null;
  buffer: Buffer;
  source: PhotoSource;
  id?: string;
  lat?: number | null;
  lng?: number | null;
  note?: string | null;
  placeName?: string | null;
  status?: PhotoStatus;
}

export interface ProcessResult {
  photo: Photo | null;
  needsPin: boolean;
  error?: string;
}

export async function processPhotoUpload(
  opts: ProcessOptions,
): Promise<ProcessResult> {
  if (opts.buffer.byteLength > MAX_BYTES) {
    return { photo: null, needsPin: false, error: "File too large (max 20MB)" };
  }

  const gps = await extractGps(opts.buffer);
  const lat = opts.lat ?? gps.lat;
  const lng = opts.lng ?? gps.lng;

  if (lat == null || lng == null) {
    return { photo: null, needsPin: true, error: "Missing GPS — drop a pin" };
  }

  let jpeg: Buffer;
  try {
    jpeg = await toJpegBuffer(opts.buffer, opts.filename, opts.mime);
  } catch (e) {
    return {
      photo: null,
      needsPin: false,
      error: e instanceof Error ? e.message : "Could not decode image",
    };
  }

  const [thumb, ditherFull, ditherThumb, density] = await Promise.all([
    makeThumb(jpeg),
    makeDither(jpeg, 1400),
    makeDitherThumb(jpeg),
    scoreDensity(jpeg),
  ]);

  const id = opts.id ?? nanoid();
  const storage = await getStorage();
  const storagePath = await storage.saveUpload(`${id}.jpg`, jpeg);
  const thumbPath = await storage.saveThumb(`${id}-dither-thumb.jpg`, ditherThumb);
  const ditherPath = await storage.saveUpload(`${id}-dither.jpg`, ditherFull);
  // Keep a color thumb available under a side name (optional archive)
  await storage.saveThumb(`${id}-thumb.jpg`, thumb);

  const autoApprove = process.env.AUTO_APPROVE_UPLOADS !== "false";
  const status: PhotoStatus =
    opts.status ??
    (opts.source === "seed"
      ? "approved"
      : autoApprove
        ? "approved"
        : "pending");

  const places = await resolvePlaceFields({
    lat,
    lng,
    cableDensity: density.cableDensity,
    placeName: opts.placeName,
    note: opts.note,
  });

  const db = await getDb();
  const photo = await db.upsertPhoto({
    id,
    lat,
    lng,
    takenAt: gps.takenAt,
    storagePath,
    thumbPath,
    ditherPath,
    skyRatio: density.skyRatio,
    cableDensity: density.cableDensity,
    tangle: density.tangle,
    status,
    source: opts.source,
    note: places.note,
    placeName: places.placeName,
  });

  return { photo, needsPin: false };
}
