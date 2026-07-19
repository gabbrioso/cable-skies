import { nanoid } from "nanoid";
import { scoreDensity } from "@/lib/density/score";
import {
  isLikelySkyPhoto,
  NOT_SKY_CODE,
  NOT_SKY_MESSAGE,
} from "@/lib/density/sky-photo";
import { extractGps } from "@/lib/exif/extract";
import { makeThumb, toJpegBuffer } from "@/lib/images/convert";
import { makeDither, makeDitherThumb } from "@/lib/images/dither";
import { resolvePlaceFields } from "@/lib/geo/place";
import { getDb } from "@/lib/db";
import { getStorage } from "@/lib/storage";
import { ARCHIVE_FULL_CODE, isArchiveFullError } from "@/lib/photos/archive";
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
  code?: typeof ARCHIVE_FULL_CODE | typeof NOT_SKY_CODE;
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

  // Score first so we can reject non-sky before heavy dither / storage writes
  const density = await scoreDensity(jpeg);
  if (opts.source === "upload" && !isLikelySkyPhoto(density)) {
    return {
      photo: null,
      needsPin: false,
      code: NOT_SKY_CODE,
      error: NOT_SKY_MESSAGE,
    };
  }

  let thumb: Buffer;
  let ditherFull: Buffer;
  let ditherThumb: Buffer;
  try {
    [thumb, ditherFull, ditherThumb] = await Promise.all([
      makeThumb(jpeg),
      makeDither(jpeg, 1100),
      makeDitherThumb(jpeg),
    ]);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (isArchiveFullError(message)) {
      return {
        photo: null,
        needsPin: false,
        code: ARCHIVE_FULL_CODE,
        error: ARCHIVE_FULL_CODE,
      };
    }
    throw e;
  }

  const id = opts.id ?? nanoid();
  const storage = await getStorage();

  let storagePath: string;
  let thumbPath: string;
  let ditherPath: string;
  try {
    storagePath = await storage.saveUpload(`${id}.jpg`, jpeg);
    thumbPath = await storage.saveThumb(`${id}-dither-thumb.jpg`, ditherThumb);
    ditherPath = await storage.saveUpload(`${id}-dither.jpg`, ditherFull);
    await storage.saveThumb(`${id}-thumb.jpg`, thumb);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (isArchiveFullError(message)) {
      return {
        photo: null,
        needsPin: false,
        code: ARCHIVE_FULL_CODE,
        error: ARCHIVE_FULL_CODE,
      };
    }
    throw e;
  }

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
