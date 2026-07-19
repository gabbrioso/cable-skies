/**
 * Place labels for the archive.
 * Canonical format: "{City} {Barangay} Sky" from map coordinates (Nominatim).
 */

import { isCrediblePlaceName } from "@/lib/geo/city";

export interface PlaceFields {
  placeName: string;
  note: string;
}

type NominatimAddress = {
  neighbourhood?: string;
  suburb?: string;
  village?: string;
  hamlet?: string;
  city_district?: string;
  quarter?: string;
  city?: string;
  town?: string;
  municipality?: string;
  county?: string;
  state?: string;
  road?: string;
};

/** Offline / last-resort label from coordinates */
export function coordinateSkyLabel(lat: number, lng: number): string {
  const ns = lat >= 0 ? "N" : "S";
  const ew = lng >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(2)}°${ns} ${Math.abs(lng).toFixed(2)}°${ew} Sky`;
}

/**
 * Display label — never "Unknown place".
 * Prefers stored placeName; otherwise builds a coordinate Sky label.
 */
export function displayPlaceLabel(photo: {
  placeName?: string | null;
  lat: number;
  lng: number;
}): string {
  const stored = photo.placeName?.trim();
  if (stored) return stored;
  return coordinateSkyLabel(photo.lat, photo.lng);
}

/** Short archival note when the contributor left none */
export function placeholderNote(
  cableDensity: number,
  placeName: string,
): string {
  if (cableDensity >= 0.7) {
    return `Dense overhead weave at ${placeName} — little unbroken sky remains.`;
  }
  if (cableDensity >= 0.45) {
    return `Cables cut the sky into shared and contested space at ${placeName}.`;
  }
  return `A clearer opening at ${placeName}; wires still claim the edge.`;
}

/**
 * City + Barangay + "Sky"
 * Barangay ≈ suburb / neighbourhood / village in OSM PH tagging.
 */
function formatCityBarangaySky(addr: NominatimAddress): string | null {
  const barangay =
    addr.suburb ||
    addr.neighbourhood ||
    addr.village ||
    addr.hamlet ||
    addr.quarter ||
    addr.city_district ||
    null;

  const city =
    addr.city || addr.town || addr.municipality || addr.county || null;

  if (city && barangay && city !== barangay) {
    return `${city} ${barangay} Sky`;
  }
  if (city) return `${city} Sky`;
  if (barangay) return `${barangay} Sky`;
  return null;
}

/**
 * Reverse-geocode via OpenStreetMap Nominatim → "City Barangay Sky".
 */
export async function resolvePlaceName(
  lat: number,
  lng: number,
): Promise<string> {
  try {
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lng));
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("zoom", "14");
    url.searchParams.set("addressdetails", "1");

    const res = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "User-Agent": "CableSkies/0.1 (interactive artwork; local archive)",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return coordinateSkyLabel(lat, lng);

    const data = (await res.json()) as { address?: NominatimAddress };
    const label = data.address ? formatCityBarangaySky(data.address) : null;
    return label || coordinateSkyLabel(lat, lng);
  } catch {
    return coordinateSkyLabel(lat, lng);
  }
}

/** Fill missing place / note for a photo being processed */
export async function resolvePlaceFields(opts: {
  lat: number;
  lng: number;
  cableDensity: number;
  placeName?: string | null;
  note?: string | null;
}): Promise<PlaceFields> {
  const provided = opts.placeName?.trim() || null;
  // Keep contributor labels only when they resolve to a real city;
  // otherwise reverse-geocode from the image GPS (OpenStreetMap Nominatim).
  const placeName = isCrediblePlaceName(provided)
    ? provided!
    : await resolvePlaceName(opts.lat, opts.lng);
  const note =
    (opts.note && opts.note.trim()) ||
    placeholderNote(opts.cableDensity, placeName);
  return { placeName, note };
}
