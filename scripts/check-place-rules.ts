/**
 * Offline guardrails for place → city parsing.
 * Runs during `npm run build` so probe / junk labels cannot ship silently.
 *
 * Usage: npx tsx scripts/check-place-rules.ts
 */

import {
  CREDIBLE_CITIES,
  extractCity,
  isCrediblePlaceName,
} from "../src/lib/geo/city";

const cases: Array<{
  placeName: string;
  credible: boolean;
  city: string;
}> = [
  { placeName: "Pasig Ugong Sky", credible: true, city: "Pasig" },
  { placeName: "Cainta San Juan Sky", credible: true, city: "Cainta" },
  { placeName: "Taytay Dolores Sky", credible: true, city: "Taytay" },
  {
    placeName: "Quezon City Teachers Village Sky",
    credible: true,
    city: "Quezon City",
  },
  { placeName: "GoLive Upload Verify", credible: false, city: "GoLive" },
  { placeName: "Upload Probe", credible: false, city: "Upload" },
  { placeName: "14.55°N 121.08°E Sky", credible: false, city: "Unknown" },
  { placeName: "", credible: false, city: "Unknown" },
];

let failed = 0;

for (const c of cases) {
  const credible = isCrediblePlaceName(c.placeName || null);
  const city = extractCity(c.placeName || null);
  if (credible !== c.credible || city !== c.city) {
    failed += 1;
    console.error(
      `FAIL "${c.placeName}": expected credible=${c.credible} city=${c.city}, got credible=${credible} city=${city}`,
    );
  }
}

for (const city of ["Pasig", "Cainta", "Taytay", "Quezon City"] as const) {
  if (!CREDIBLE_CITIES.has(city)) {
    failed += 1;
    console.error(`FAIL missing corridor city in allowlist: ${city}`);
  }
}

if (failed > 0) {
  console.error(`place rules check failed (${failed} errors)`);
  process.exit(1);
}

console.log(`place rules ok (${cases.length} cases)`);
