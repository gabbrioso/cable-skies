import type { DensityScore } from "@/lib/types";

export const NOT_SKY_CODE = "not_sky" as const;

export const NOT_SKY_MESSAGE =
  "This doesn’t look like a sky photo. Please upload a photo of the sky — with or without overhead cables.";

/**
 * Accept open sky and cable-sky looking-up shots; reject indoor / food / ground-only.
 * Uses the existing skyRatio + upper-band sky heuristics from scoreDensity.
 */
export function isLikelySkyPhoto(score: DensityScore): boolean {
  const { skyRatio, upperSkyRatio, cableDensity } = score;

  // Clear open sky (plain sky OK)
  if (upperSkyRatio >= 0.3 || skyRatio >= 0.35) return true;

  // Looking up through wires — sky still visible in the upper frame
  if (upperSkyRatio >= 0.15 && skyRatio >= 0.1) return true;

  // Dense cable canopy: less open sky, but upper band + wire structure
  if (upperSkyRatio >= 0.12 && cableDensity >= 0.18) return true;

  return false;
}
