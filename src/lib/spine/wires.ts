import * as THREE from "three";
import type { OrderedPhoto } from "@/lib/route/order";

/** Fixed cable pool — all run full spine length; peel count spans 10–80 by density */
export const CABLE_COUNT_MIN = 10;
export const CABLE_COUNT = 80;

export interface FlowRibbon {
  id: string;
  photoId: string;
  points: THREE.Vector3[];
  radius: number;
  lane: number;
}

/** One sample of the invisible cylinder profile — for the science matrix / graph */
export interface ProfileSample {
  t: number;
  y: number;
  radius: number;
  density: number;
  tangle: number;
  skyRatio: number;
  axialWeight: number;
  stiffness: number;
  photoId: string;
  city: string;
}

/** Contiguous vertical band of the spine mapped to a city */
export interface CityZone {
  city: string;
  t0: number;
  t1: number;
  density: number;
  tangle: number;
  skyRatio: number;
  photoIds: string[];
}

export interface SpineGeometry {
  ribbons: FlowRibbon[];
  profile: ProfileSample[];
  zones: CityZone[];
  yMin: number;
  yMax: number;
  maxRadius: number;
}

/** Rest height of the guide cylinder along Y */
export const SPINE_LENGTH = 26;

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0 || 1)));
  return t * t * (3 - 2 * t);
}

/** "Pasig Ugong Sky" / "Quezon City Teachers Village Sky" → city */
export function extractCity(placeName: string | null | undefined): string {
  if (!placeName?.trim()) return "Unknown";
  const base = placeName.replace(/\s+Sky$/i, "").trim();
  if (/^Quezon City\b/i.test(base)) return "Quezon City";
  const parts = base.split(/\s+/);
  return parts[0] || "Unknown";
}

function sampleAlongRoute(
  photos: OrderedPhoto[],
  xNorm: number,
): OrderedPhoto {
  if (photos.length === 1) return photos[0];
  let best = photos[0];
  let bestD = Infinity;
  for (const p of photos) {
    const d = Math.abs(p.xNorm - xNorm);
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return best;
}

/**
 * Group ordered photos into contiguous city zones along the route (t = 0→1).
 */
export function buildCityZones(photos: OrderedPhoto[]): CityZone[] {
  if (photos.length === 0) return [];

  const sorted = [...photos].sort((a, b) => a.xNorm - b.xNorm);
  const zones: CityZone[] = [];
  let i = 0;

  while (i < sorted.length) {
    const city = extractCity(sorted[i].placeName);
    const start = i;
    while (i < sorted.length && extractCity(sorted[i].placeName) === city) {
      i++;
    }
    const slice = sorted.slice(start, i);
    const t0 = slice[0].xNorm;
    const t1 = slice[slice.length - 1].xNorm;
    // Pad zone edges so single-photo cities still have thickness
    const pad = Math.max(0.02, (1 / Math.max(photos.length, 1)) * 0.6);
    const z0 = Math.max(0, t0 - pad * 0.35);
    const z1 = Math.min(1, t1 + pad * 0.35);

    const density =
      slice.reduce((s, p) => s + p.cableDensity, 0) / slice.length;
    const tangle = slice.reduce((s, p) => s + p.tangle, 0) / slice.length;
    const skyRatio = slice.reduce((s, p) => s + p.skyRatio, 0) / slice.length;

    zones.push({
      city,
      t0: zones.length === 0 ? 0 : z0,
      t1: i >= sorted.length ? 1 : z1,
      density,
      tangle,
      skyRatio,
      photoIds: slice.map((p) => p.id),
    });
  }

  // Stitch so zones cover [0,1] without gaps
  if (zones.length > 0) {
    zones[0].t0 = 0;
    zones[zones.length - 1].t1 = 1;
    for (let z = 1; z < zones.length; z++) {
      const mid = (zones[z - 1].t1 + zones[z].t0) / 2;
      zones[z - 1].t1 = mid;
      zones[z].t0 = mid;
    }
  }

  return zones;
}

function zoneAt(zones: CityZone[], t: number): CityZone | null {
  if (zones.length === 0) return null;
  for (const z of zones) {
    if (t >= z.t0 && t <= z.t1) return z;
  }
  return zones[Math.min(zones.length - 1, Math.floor(t * zones.length))];
}

/**
 * Soft blend of zone metrics so cables don't pop at city boundaries.
 */
function metricsAt(
  zones: CityZone[],
  photos: OrderedPhoto[],
  t: number,
): { density: number; tangle: number; sky: number; city: string; photoId: string } {
  const photo = sampleAlongRoute(photos, t);
  const zone = zoneAt(zones, t);
  if (!zone) {
    return {
      density: photo.cableDensity,
      tangle: photo.tangle,
      sky: photo.skyRatio,
      city: extractCity(photo.placeName),
      photoId: photo.id,
    };
  }

  // Blend with photo for local variation inside the city band
  return {
    density: lerp(zone.density, photo.cableDensity, 0.45),
    tangle: lerp(zone.tangle, photo.tangle, 0.4),
    sky: lerp(zone.skyRatio, photo.skyRatio, 0.4),
    city: zone.city,
    photoId: photo.id,
  };
}

function buildCylinderProfile(
  photos: OrderedPhoto[],
  zones: CityZone[],
) {
  const samples = 96;
  const weights: number[] = [];
  const densities: number[] = [];
  const tangles: number[] = [];
  const skies: number[] = [];
  const photoIds: string[] = [];
  const cities: string[] = [];

  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const m = metricsAt(zones, photos, t);
    // Dense / tangled zones shorten the axial run slightly
    const axialWeight = Math.max(0.4, 1 - m.density * 0.4 - m.tangle * 0.1);
    weights.push(axialWeight);
    densities.push(m.density);
    tangles.push(m.tangle);
    skies.push(m.sky);
    photoIds.push(m.photoId);
    cities.push(m.city);
  }

  const totalW = weights.reduce((a, b) => a + b, 0);
  const yAt: number[] = [];
  let acc = 0;
  for (let i = 0; i <= samples; i++) {
    yAt.push(SPINE_LENGTH / 2 - (acc / totalW) * SPINE_LENGTH);
    if (i < samples) acc += (weights[i] + weights[i + 1]) / 2;
  }

  function radiusAt(t: number): number {
    const i = Math.min(samples, Math.max(0, Math.floor(t * samples)));
    const d = densities[i];
    const tangle = tangles[i];
    const sky = skies[i];
    // Open sky → wider envelope; density → thicker bloom
    const base = 0.85 + d * 1.55 + (1 - sky) * 0.25 + sky * 0.95 + tangle * 0.35;
    const wave =
      Math.sin(t * Math.PI * 2.8) * (0.2 + d * 0.4) +
      Math.sin(t * Math.PI * 6.5 + 0.5) * tangle * 0.35;
    return Math.max(0.55, base + wave);
  }

  function yFromT(t: number): number {
    const f = t * samples;
    const i = Math.min(samples - 1, Math.max(0, Math.floor(f)));
    const frac = f - i;
    return yAt[i] * (1 - frac) + yAt[i + 1] * frac;
  }

  const profile: ProfileSample[] = [];
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const d = densities[i];
    const tangle = tangles[i];
    profile.push({
      t,
      y: yAt[i],
      radius: radiusAt(t),
      density: d,
      tangle,
      skyRatio: skies[i],
      axialWeight: weights[i],
      stiffness: Math.min(1, d * 0.55 + tangle * 0.45),
      photoId: photoIds[i],
      city: cities[i],
    });
  }

  return { radiusAt, yFromT, profile };
}

/**
 * Continuous fixed-count cables through city zones.
 *
 * Continuity strategy: every cable runs the full height. In sparse / open-sky
 * zones, outer lanes collapse toward a thin core (reads as fewer cables). In
 * dense zones they peel outward into a fuller bloom — paths never break.
 *
 * - Density → how many lanes peel out + bloom radius
 * - Tangle → twist rate + knotting amplitude
 * - Open sky → wider spacing among active cables
 */
export function buildSpineGeometry(photos: OrderedPhoto[]): SpineGeometry {
  if (photos.length === 0) {
    return {
      ribbons: [],
      profile: [],
      zones: [],
      yMin: -1,
      yMax: 1,
      maxRadius: 1,
    };
  }

  const zones = buildCityZones(photos);
  const { radiusAt, yFromT, profile } = buildCylinderProfile(photos, zones);

  const cableCount = CABLE_COUNT;
  const steps = 120;
  const ribbons: FlowRibbon[] = [];

  for (let lane = 0; lane < cableCount; lane++) {
    const seed = hash(`zone-cable-${lane}`);
    const laneNorm = lane / (cableCount - 1); // 0 = core … 1 = outer
    const baseAngle = (lane / cableCount) * Math.PI * 2 + seed * 0.35;
    const points: THREE.Vector3[] = [];
    let nearestPhotoId = photos[0].id;
    let radiusSum = 0;

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const m = metricsAt(zones, photos, t);
      nearestPhotoId = m.photoId;

      const { density: d, tangle, sky } = m;
      const envelope = radiusAt(t);

      // Sparse zones ≈ 10 peeled cables; dense zones ≈ all 80
      const activeFrac = lerp(
        CABLE_COUNT_MIN / CABLE_COUNT,
        1,
        Math.pow(d, 0.85),
      );
      // Soft peel: outer lanes stay near core when density is low
      const peel = smoothstep(activeFrac - 0.18, activeFrac + 0.1, 1 - laneNorm);

      // Core radius (collapsed bundle) vs bloomed ring
      const coreR = 0.22 + (1 - d) * 0.12;
      // Open sky spaces active cables farther apart on a larger ring
      const skySpread = lerp(0.75, 1.55, sky);
      const bloomR = envelope * skySpread * (0.45 + laneNorm * 0.55);

      const radialTarget = lerp(coreR, bloomR, peel);

      // Tangle: helical twist + knotted wobble (stronger when peeled)
      const twistRate = 0.35 + tangle * 2.8;
      const theta =
        baseAngle +
        t * twistRate * Math.PI * 2 +
        Math.sin(t * Math.PI * (1.2 + tangle * 5) + seed * 6 + lane * 0.4) *
          tangle *
          (0.55 + peel * 0.9) +
        Math.sin(t * Math.PI * 11 + lane * 1.7) * tangle * peel * 0.35;

      const radialJitter =
        Math.sin(t * 8 + lane * 0.9 + seed * 4) * tangle * peel * 0.45 +
        Math.cos(t * 13 + seed) * d * peel * 0.12;

      const radial = Math.max(0.08, radialTarget + radialJitter);
      const y = yFromT(t);

      points.push(
        new THREE.Vector3(
          Math.cos(theta) * radial,
          y,
          Math.sin(theta) * radial,
        ),
      );

      // Slightly thinner when collapsed into the core
      radiusSum += lerp(0.01, 0.018 + d * 0.028 + tangle * 0.01, 0.35 + peel * 0.65);
    }

    ribbons.push({
      id: `c-${lane}`,
      photoId: nearestPhotoId,
      points,
      radius: (radiusSum / (steps + 1)) * (0.85 + (lane % 4) * 0.08),
      lane,
    });
  }

  const ys = profile.map((p) => p.y);
  const rs = profile.map((p) => p.radius);

  return {
    ribbons,
    profile,
    zones,
    yMin: Math.min(...ys),
    yMax: Math.max(...ys),
    maxRadius: Math.max(...rs),
  };
}

/** Map a world Y back to nearest photo along the route */
export function photoIdAtY(
  photos: OrderedPhoto[],
  profile: ProfileSample[],
  y: number,
): string {
  if (profile.length === 0) return photos[0]?.id ?? "";
  let best = profile[0];
  let bestD = Infinity;
  for (const s of profile) {
    const d = Math.abs(s.y - y);
    if (d < bestD) {
      bestD = d;
      best = s;
    }
  }
  return best.photoId;
}

export function cityAtY(profile: ProfileSample[], y: number): string {
  return sampleAtY(profile, y)?.city ?? "";
}

/** Nearest profile sample to a world Y */
export function sampleAtY(
  profile: ProfileSample[],
  y: number,
): ProfileSample | null {
  if (profile.length === 0) return null;
  let best = profile[0];
  let bestD = Infinity;
  for (const s of profile) {
    const d = Math.abs(s.y - y);
    if (d < bestD) {
      bestD = d;
      best = s;
    }
  }
  return best;
}

/** City zone covering the nearest profile sample at world Y */
export function zoneAtY(
  profile: ProfileSample[],
  zones: CityZone[],
  y: number,
): CityZone | null {
  const sample = sampleAtY(profile, y);
  if (!sample || zones.length === 0) return null;
  for (const z of zones) {
    if (sample.t >= z.t0 && sample.t <= z.t1) return z;
  }
  return zones.find((z) => z.city === sample.city) ?? null;
}
