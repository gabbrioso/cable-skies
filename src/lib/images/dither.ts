import sharp from "sharp";

/** 4×4 Bayer matrix (0–15), normalized in use */
const BAYER4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

/**
 * Ordered Bayer dither → hard black/white (Anadol / cable-spine aesthetic).
 */
export async function makeDither(
  jpegBuffer: Buffer,
  maxEdge = 1280,
): Promise<Buffer> {
  const { data, info } = await sharp(jpegBuffer)
    .rotate()
    .resize(maxEdge, maxEdge, { fit: "inside", withoutEnlargement: true })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const w = info.width;
  const h = info.height;
  const out = Buffer.alloc(w * h);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const lum = data[i];
      const threshold = ((BAYER4[y & 3][x & 3] + 0.5) / 16) * 255;
      out[i] = lum > threshold ? 220 : 0;
    }
  }

  return sharp(out, { raw: { width: w, height: h, channels: 1 } })
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer();
}

export async function makeDitherThumb(jpegBuffer: Buffer): Promise<Buffer> {
  return makeDither(jpegBuffer, 480);
}
