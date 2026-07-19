import sharp from "sharp";

const HEIC_TYPES = new Set([
  "image/heic",
  "image/heif",
  "image/heic-sequence",
  "image/heif-sequence",
]);

export function isHeic(filename: string, mime?: string | null): boolean {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".heic") || lower.endsWith(".heif")) return true;
  if (mime && HEIC_TYPES.has(mime.toLowerCase())) return true;
  return false;
}

/** Detect HEIC/HEIF from ISO-BMFF `ftyp` brand when MIME/filename is wrong */
export function bufferLooksLikeHeic(input: Buffer): boolean {
  if (input.length < 12) return false;
  const ftyp = input.toString("ascii", 4, 8);
  if (ftyp !== "ftyp") return false;
  const brand = input.toString("ascii", 8, 12);
  return /^(heic|heix|hevc|hevx|mif1|msf1|heim|heis)/i.test(brand);
}

async function heicConvertToJpeg(input: Buffer): Promise<Buffer> {
  const convert = (await import("heic-convert")).default as (opts: {
    buffer: Buffer;
    format: "JPEG" | "PNG";
    quality: number;
  }) => Promise<ArrayBuffer>;

  const ab = await convert({
    buffer: input,
    format: "JPEG",
    quality: 0.88,
  });
  return Buffer.from(ab);
}

/**
 * Accept common phone/camera formats (JPEG, PNG, WebP, HEIC/HEIF, AVIF, TIFF, GIF…)
 * and normalize to JPEG for the archive pipeline.
 */
export async function toJpegBuffer(
  input: Buffer,
  filename: string,
  mime?: string | null,
): Promise<Buffer> {
  const wantsHeic =
    isHeic(filename, mime) || bufferLooksLikeHeic(input);

  if (wantsHeic) {
    try {
      const decoded = await heicConvertToJpeg(input);
      return sharp(decoded)
        .rotate()
        .jpeg({ quality: 85, mozjpeg: true })
        .toBuffer();
    } catch {
      // Some builds of sharp include libheif — try as a fallback
      try {
        return await sharp(input)
          .rotate()
          .jpeg({ quality: 85, mozjpeg: true })
          .toBuffer();
      } catch {
        throw new Error(
          "Could not decode HEIC/HEIF. Please try again, or export as JPEG from Photos.",
        );
      }
    }
  }

  try {
    return await sharp(input)
      .rotate()
      .jpeg({ quality: 85, mozjpeg: true })
      .toBuffer();
  } catch {
    // Last resort: treat unknown bytes as HEIC (empty MIME from iOS)
    if (bufferLooksLikeHeic(input) || !mime || mime === "application/octet-stream") {
      try {
        const decoded = await heicConvertToJpeg(input);
        return sharp(decoded)
          .rotate()
          .jpeg({ quality: 85, mozjpeg: true })
          .toBuffer();
      } catch {
        /* fall through */
      }
    }
    throw new Error(
      "Could not decode this image. Try JPEG, PNG, WebP, or HEIC from your camera roll.",
    );
  }
}

export async function makeThumb(jpegBuffer: Buffer): Promise<Buffer> {
  return sharp(jpegBuffer)
    .rotate()
    .resize(480, 480, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 75, mozjpeg: true })
    .toBuffer();
}
