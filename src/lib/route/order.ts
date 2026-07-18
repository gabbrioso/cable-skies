import type { Photo } from "@/lib/types";

export interface OrderedPhoto extends Photo {
  /** Normalized position along the spine X axis (0–1) */
  xNorm: number;
  /** Distance along corridor from first point (meters, approximate) */
  distanceM: number;
}

function haversineM(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/**
 * Order photos along the work→home corridor.
 * Prefer chronological seed order when timestamps exist; otherwise project onto
 * the polyline from first-to-last by capture sequence / geographic progression.
 */
export function orderPhotosAlongRoute(photos: Photo[]): OrderedPhoto[] {
  if (photos.length === 0) return [];

  const withTime = photos.filter((p) => p.takenAt);
  const sorted =
    withTime.length >= photos.length * 0.5
      ? [...photos].sort((a, b) => {
          const ta = a.takenAt ? Date.parse(a.takenAt) : 0;
          const tb = b.takenAt ? Date.parse(b.takenAt) : 0;
          if (ta !== tb) return ta - tb;
          return a.createdAt.localeCompare(b.createdAt);
        })
      : [...photos].sort((a, b) => {
          // Fallback: west→east then south→north along typical PH urban rides
          if (a.lng !== b.lng) return a.lng - b.lng;
          return a.lat - b.lat;
        });

  let cumulative = 0;
  const distances: number[] = [0];
  for (let i = 1; i < sorted.length; i++) {
    cumulative += haversineM(
      sorted[i - 1].lat,
      sorted[i - 1].lng,
      sorted[i].lat,
      sorted[i].lng,
    );
    distances.push(cumulative);
  }

  const maxD = distances[distances.length - 1] || 1;

  return sorted.map((photo, i) => ({
    ...photo,
    distanceM: distances[i],
    xNorm: distances[i] / maxD,
  }));
}
