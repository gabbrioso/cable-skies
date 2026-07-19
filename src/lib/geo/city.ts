/**
 * City labels for the cable spine.
 * Place strings are usually "{City} {Barangay} Sky" from Nominatim / contributors.
 */

/** Cities along the Metro Manila / Rizal corridor (and common neighbors). */
export const CREDIBLE_CITIES = new Set([
  "Pasig",
  "Cainta",
  "Taytay",
  "Quezon City",
  "Manila",
  "Makati",
  "Mandaluyong",
  "Marikina",
  "San Juan",
  "Taguig",
  "Pateros",
  "Antipolo",
  "Angono",
  "Binangonan",
  "Rodriguez",
  "San Mateo",
  "Teresa",
  "Morong",
  "Baras",
  "Cardona",
  "Pililla",
  "Jalajala",
  "Tanay",
  "Kalookan",
  "Caloocan",
  "Malabon",
  "Navotas",
  "Valenzuela",
  "Parañaque",
  "Paranaque",
  "Las Piñas",
  "Las Pinas",
  "Muntinlupa",
  "Pasay",
]);

const BLOCKED_CITY_TOKENS = new Set([
  "golive",
  "upload",
  "probe",
  "test",
  "verify",
  "sample",
  "demo",
  "placeholder",
  "unknown",
  "localhost",
  "tmp",
  "temp",
]);

/** "Pasig Ugong Sky" / "Quezon City Teachers Village Sky" → city */
export function extractCity(placeName: string | null | undefined): string {
  if (!placeName?.trim()) return "Unknown";
  const base = placeName.replace(/\s+Sky$/i, "").trim();
  // Coordinate fallback labels are not cities
  if (/^\d+(\.\d+)?°/.test(base)) return "Unknown";
  if (/^Quezon City\b/i.test(base)) return "Quezon City";
  const parts = base.split(/\s+/);
  return parts[0] || "Unknown";
}

/**
 * True when a contributor / stored label is safe to keep.
 * Fake deploy labels ("Upload Probe") and coordinate stubs fail.
 */
export function isCrediblePlaceName(
  placeName: string | null | undefined,
): boolean {
  if (!placeName?.trim()) return false;
  const trimmed = placeName.trim();
  if (/^\d+(\.\d+)?°/.test(trimmed)) return false;

  const city = extractCity(trimmed);
  if (!city || city === "Unknown") return false;
  if (BLOCKED_CITY_TOKENS.has(city.toLowerCase().replace(/\s+/g, ""))) {
    return false;
  }
  if (BLOCKED_CITY_TOKENS.has(city.toLowerCase())) return false;

  // Reject probe-style multiword titles that aren't "... Sky"
  if (
    !/\sSky$/i.test(trimmed) &&
    /\b(probe|verify|upload|test|demo|sample)\b/i.test(trimmed)
  ) {
    return false;
  }

  return CREDIBLE_CITIES.has(city);
}
