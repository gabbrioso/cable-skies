/**
 * Prepare a phone/camera photo for POST /api/photos.
 * Vercel Hobby caps request bodies ~4.5MB — compress client-side and keep GPS.
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

function loadImageBitmap(file: File): Promise<ImageBitmap> {
  return createImageBitmap(file);
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", quality);
  });
}

async function compressToJpeg(file: File): Promise<File> {
  // Already small enough and JPEG — skip work
  if (
    file.size <= MAX_UPLOAD_BYTES &&
    (file.type === "image/jpeg" || /\.jpe?g$/i.test(file.name))
  ) {
    return file;
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await loadImageBitmap(file);
  } catch {
    // HEIC/unknown — if under the wire limit, send as-is for server convert
    if (file.size <= MAX_UPLOAD_BYTES) return file;
    throw new Error(
      "This photo is too large for mobile upload. Try a smaller JPEG, or open Desktop.",
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
  while (blob && blob.size > MAX_UPLOAD_BYTES && quality > 0.45) {
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

/** Extract GPS from the original, then compress for the network. */
export async function prepareUploadFile(file: File): Promise<PreparedUpload> {
  const gps = await readGps(file);
  const prepared = await compressToJpeg(file);
  return { file: prepared, lat: gps.lat, lng: gps.lng };
}
