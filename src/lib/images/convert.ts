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

export async function toJpegBuffer(
  input: Buffer,
  filename: string,
  mime?: string | null,
): Promise<Buffer> {
  let working = input;

  if (isHeic(filename, mime)) {
    // heic-convert is CommonJS
    const convert = (await import("heic-convert")).default as (opts: {
      buffer: Buffer;
      format: "JPEG" | "PNG";
      quality: number;
    }) => Promise<ArrayBuffer>;

    const ab = await convert({
      buffer: input,
      format: "JPEG",
      quality: 0.9,
    });
    working = Buffer.from(ab);
  }

  return sharp(working)
    .rotate()
    .jpeg({ quality: 85, mozjpeg: true })
    .toBuffer();
}

export async function makeThumb(jpegBuffer: Buffer): Promise<Buffer> {
  return sharp(jpegBuffer)
    .rotate()
    .resize(480, 480, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 75, mozjpeg: true })
    .toBuffer();
}
