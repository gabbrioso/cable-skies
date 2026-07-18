import fs from "fs";
import path from "path";
import { ASSETS_DIR } from "../src/lib/paths";
import { getSqlite, sqliteDb } from "../src/lib/db/sqlite";
import { processPhotoUpload } from "../src/lib/photos/process";

async function main() {
  getSqlite();

  if (!fs.existsSync(ASSETS_DIR)) {
    console.error("No assets/ folder found");
    process.exit(1);
  }

  const files = fs
    .readdirSync(ASSETS_DIR)
    .filter((f) => /\.(heic|heif|jpe?g|png|webp)$/i.test(f))
    .filter((f) => !f.includes("(1)")) // skip duplicate copy
    .sort();

  console.log(`Found ${files.length} images in assets/`);

  let ok = 0;
  let skipped = 0;
  let needsPin = 0;

  const coords: { lat: number; lng: number; takenAt: string | null }[] = [];

  for (const file of files) {
    const id = path.parse(file).name.replace(/\s+/g, "-");
    const buffer = fs.readFileSync(path.join(ASSETS_DIR, file));

    const result = await processPhotoUpload({
      id: `seed-${id}`,
      filename: file,
      buffer,
      source: "seed",
      status: "approved",
    });

    if (result.needsPin) {
      console.warn(`  [no GPS] ${file}`);
      needsPin++;
      continue;
    }
    if (result.error || !result.photo) {
      console.warn(`  [skip] ${file}: ${result.error}`);
      skipped++;
      continue;
    }

    coords.push({
      lat: result.photo.lat,
      lng: result.photo.lng,
      takenAt: result.photo.takenAt,
    });
    console.log(
      `  [ok] ${file}  density=${result.photo.cableDensity.toFixed(2)}  sky=${result.photo.skyRatio.toFixed(2)}`,
    );
    ok++;
  }

  if (coords.length >= 2) {
    const ordered = [...coords].sort((a, b) => {
      const ta = a.takenAt ? Date.parse(a.takenAt) : 0;
      const tb = b.takenAt ? Date.parse(b.takenAt) : 0;
      return ta - tb || a.lng - b.lng;
    });
    const work = ordered[0];
    const home = ordered[ordered.length - 1];
    sqliteDb.setRouteMeta({
      workLat: work.lat,
      workLng: work.lng,
      homeLat: home.lat,
      homeLng: home.lng,
    });
    console.log(
      `Route meta: work (${work.lat.toFixed(5)}, ${work.lng.toFixed(5)}) → home (${home.lat.toFixed(5)}, ${home.lng.toFixed(5)})`,
    );
  }

  console.log(`\nDone. ok=${ok} needsPin=${needsPin} skipped=${skipped}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
