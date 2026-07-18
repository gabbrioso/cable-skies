import sharp from "sharp";
import type { DensityScore } from "@/lib/types";

/**
 * Heuristic cable/sky density scorer.
 * - skyRatio: fraction of pixels that look like open sky
 * - cableDensity: edge energy in non-sky regions (wires, poles)
 * - tangle: how "messy" edges are (high local variation → knotted look)
 */
export async function scoreDensity(imageBuffer: Buffer): Promise<DensityScore> {
  const { data, info } = await sharp(imageBuffer)
    .resize(160, 160, { fit: "inside" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const w = info.width;
  const h = info.height;
  const channels = info.channels;
  const total = w * h;

  let skyCount = 0;
  const isSky = new Uint8Array(total);

  for (let i = 0; i < total; i++) {
    const o = i * channels;
    const r = data[o];
    const g = data[o + 1];
    const b = data[o + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const brightness = (r + g + b) / 3;
    const saturation = max === 0 ? 0 : (max - min) / max;

    // Sky: bright, low-mid saturation, blue-leaning or pale grey
    const blueLean = b >= r * 0.9 && b >= g * 0.85;
    const pale = brightness > 140 && saturation < 0.35;
    const blueSky = brightness > 100 && blueLean && b > 110;

    if (pale || blueSky) {
      isSky[i] = 1;
      skyCount++;
    }
  }

  const skyRatio = skyCount / total;

  // Sobel-ish edge magnitude on luminance
  const lum = new Float32Array(total);
  for (let i = 0; i < total; i++) {
    const o = i * channels;
    lum[i] = 0.299 * data[o] + 0.587 * data[o + 1] + 0.114 * data[o + 2];
  }

  let edgeSum = 0;
  let edgeCount = 0;
  let tangleAccum = 0;
  let tangleSamples = 0;

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      if (isSky[i]) continue;

      const gx =
        -lum[i - w - 1] -
        2 * lum[i - 1] -
        lum[i + w - 1] +
        lum[i - w + 1] +
        2 * lum[i + 1] +
        lum[i + w + 1];
      const gy =
        -lum[i - w - 1] -
        2 * lum[i - w] -
        lum[i - w + 1] +
        lum[i + w - 1] +
        2 * lum[i + w] +
        lum[i + w + 1];

      const mag = Math.sqrt(gx * gx + gy * gy);
      edgeSum += mag;
      edgeCount++;

      // Local edge direction change ≈ tangle
      const neighbors = [
        Math.abs(gx - (-lum[i - 2] + lum[i + 2] || 0)),
        Math.abs(gy - (-lum[i - 2 * w] + lum[i + 2 * w] || 0)),
      ];
      tangleAccum += (neighbors[0] + neighbors[1]) / 2;
      tangleSamples++;
    }
  }

  const meanEdge = edgeCount > 0 ? edgeSum / edgeCount : 0;
  // Normalize roughly into 0–1
  const cableDensity = clamp01(meanEdge / 80);
  const meanTangle = tangleSamples > 0 ? tangleAccum / tangleSamples : 0;
  const tangle = clamp01(meanTangle / 60);

  // Density rises when sky shrinks and edges/tangle rise
  const combined = clamp01(
    (1 - skyRatio) * 0.45 + cableDensity * 0.35 + tangle * 0.2,
  );

  return {
    skyRatio: round4(skyRatio),
    cableDensity: round4(combined),
    tangle: round4(tangle),
  };
}

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

function round4(n: number) {
  return Math.round(n * 10000) / 10000;
}
