/**
 * Backfill place_name + note for every photo (Nominatim + placeholders).
 * Usage: npx tsx scripts/backfill-places.ts
 */

import { sqliteDb } from "../src/lib/db/sqlite";
import { resolvePlaceFields } from "../src/lib/geo/place";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const photos = sqliteDb.listPhotos("all");
  console.log(`Backfilling places for ${photos.length} photos…`);

  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i];
    const places = await resolvePlaceFields({
      lat: photo.lat,
      lng: photo.lng,
      cableDensity: photo.cableDensity,
      placeName: null, // force fresh geocode
      note: null,
    });

    sqliteDb.upsertPhoto({
      ...photo,
      placeName: places.placeName,
      note: places.note,
    });

    console.log(
      `  [${i + 1}/${photos.length}] ${photo.id} → ${places.placeName}`,
    );

    // Nominatim usage policy: max ~1 req/s
    if (i < photos.length - 1) await sleep(1100);
  }

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
