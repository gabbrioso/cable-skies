/**
 * Prepare a phone/camera photo for POST /api/photos.
 * Vercel Hobby caps request bodies ~4.5MB — convert HEIC + compress client-side.
 * GPS is read from the original file before conversion (EXIF is stripped by canvas).
 */

import exifr from "exifr";

/** Stay under Vercel serverless body limits with headroom for FormData fields */
const MAX_UPLOAD_BYTES = 3.2 * 1024 * 1024;
const MAX_EDGE = 1600;

export interface PreparedUpload {
  file: File;
  lat: number | null;
  lng: number | null;
}

export function isHeicLike(file: File): boolean {
  const type = (file.type || "").toLowerCase();
  const name = file.name.toLowerCase();
  if (
    type.includes("heic") ||
    type.includes("heif") ||
    name.endsWith(".heic") ||
    name.endsWith(".heif")
  ) {
    return true;
  }
  return false;
}

async function readGps(file: File): Promise<{ lat: number | null; lng: number | null }> {
  try {
    const gps = await exifr.gps(file);
    const lat =
      gps && typeof gps.latitude === "number" && Number.isFinite(gps.latitude)
        ? gps.latitude
        : null;
    const lng =
      gps && typeof gps.longitude === "number" && Number.isFinite(gps.longitude)
        ? gps.longitude
        : null;
    return { lat, lng };
  } catch {
    return { lat: null, lng: null };
  }
}

/** Sniff ISO-BMFF HEIC/HEIF when the phone omits a useful MIME type */
async function sniffHeic(file: File): Promise<boolean> {
  if (isHeicLike(file)) return true;
  try {
    const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
    if (head.length < 12) return false;
    const brand = String.fromCharCode(...head.slice(8, 12));
    const ftyp = String.fromCharCode(...head.slice(4, 8));
    return (
      ftyp === "ftyp" &&
      /^(heic|heix|hevc|hevx|mif1|msf1|heim|heis)/i.test(brand)
    );
  } catch {
    return false;
  }
}

async function heicToJpegFile(file: File): Promise<File> {
  const heic2any = (await import("heic2any")).default;
  // Aggressive quality so large iPhone HEICs fit under the Vercel body cap
  const result = await heic2any({
    blob: file,
    toType: "image/jpeg",
    quality: 0.7,
  });
  const blob = Array.isArray(result) ? result[0] : result;
  const base = file.name.replace(/\.[^.]+$/, "") || "sky";
  return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", quality);
  });
}

async function compressDecoded(file: File): Promise<File> {
  if (
    file.size <= MAX_UPLOAD_BYTES &&
    (file.type === "image/jpeg" || /\.jpe?g$/i.test(file.name))
  ) {
    return file;
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    if (file.size <= MAX_UPLOAD_BYTES) return file;
    throw new Error(
      "Could not prepare this photo on your device. Try again, or use a smaller image.",
    );
  }

  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("Could not prepare image");
  }
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  let quality = 0.82;
  let blob = await canvasToBlob(canvas, quality);
  while (blob && blob.size > MAX_UPLOAD_BYTES && quality > 0.4) {
    quality -= 0.08;
    blob = await canvasToBlob(canvas, quality);
  }

  if (!blob || blob.size > MAX_UPLOAD_BYTES) {
    throw new Error(
      "Could not compress this photo enough for upload. Try another image.",
    );
  }

  const base = file.name.replace(/\.[^.]+$/, "") || "sky";
  return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
}

/**
 * Convert HEIC/HEIF (and other phone formats) to a network-safe JPEG under ~3.2MB.
 */
export async function prepareUploadFile(file: File): Promise<PreparedUpload> {
  const gps = await readGps(file);
  let working = file;

  if (await sniffHeic(file)) {
    try {
      working = await heicToJpegFile(file);
    } catch {
      // Server can still decode small HEICs via heic-convert
      if (file.size <= MAX_UPLOAD_BYTES) {
        return { file, lat: gps.lat, lng: gps.lng };
      }
      throw new Error(
        "Could not prepare this HEIC photo. On iPhone: Settings → Camera → Formats → Most Compatible, or try again.",
      );
    }
  }

  const prepared = await compressDecoded(working);
  return { file: prepared, lat: gps.lat, lng: gps.lng };
}
