/**
 * Migrate local SQLite photos + files to Supabase.
 *
 * Prerequisites:
 *   npm install @supabase/supabase-js
 *   Set STORAGE_BACKEND=supabase and Supabase env vars (see DEPLOY.md)
 *   Create photos + route_meta tables in Supabase SQL editor
 *
 * Usage (after env is set):
 *   npx tsx scripts/migrate-to-supabase.ts
 *
 * This script reads from local SQLite regardless of STORAGE_BACKEND,
 * then writes through the Supabase adapters.
 */

import fs from "fs";
import path from "path";
import { sqliteDb } from "../src/lib/db/sqlite";
import { DATA_DIR } from "../src/lib/paths";

async function main() {
  if (process.env.STORAGE_BACKEND !== "supabase") {
    console.error("Set STORAGE_BACKEND=supabase and Supabase keys before migrating.");
    process.exit(1);
  }

  const { createSupabaseDb } = await import("../src/lib/db/supabase");
  const { createSupabaseStorage } = await import("../src/lib/storage/supabase");

  const remoteDb = createSupabaseDb();
  const remoteStorage = createSupabaseStorage();

  const photos = sqliteDb.listPhotos("all");
  console.log(`Migrating ${photos.length} photos…`);

  for (const photo of photos) {
    const paths = [photo.storagePath, photo.thumbPath, photo.ditherPath].filter(
      (p): p is string => Boolean(p),
    );
    for (const rel of paths) {
      const full = path.join(DATA_DIR, rel);
      if (!fs.existsSync(full)) {
        console.warn(`  missing file ${rel}`);
        continue;
      }
      const buf = fs.readFileSync(full);
      const name = path.basename(rel);
      if (rel.startsWith("thumbs/")) {
        await remoteStorage.saveThumb(name, buf);
      } else {
        await remoteStorage.saveUpload(name, buf);
      }
    }

    await remoteDb.upsertPhoto({
      id: photo.id,
      lat: photo.lat,
      lng: photo.lng,
      takenAt: photo.takenAt,
      storagePath: photo.storagePath,
      thumbPath: photo.thumbPath,
      ditherPath: photo.ditherPath,
      skyRatio: photo.skyRatio,
      cableDensity: photo.cableDensity,
      tangle: photo.tangle,
      status: photo.status,
      source: photo.source,
      note: photo.note,
      placeName: photo.placeName,
    });
    console.log(`  migrated ${photo.id}`);
  }

  const route = sqliteDb.getRouteMeta();
  if (route) {
    await remoteDb.setRouteMeta({
      workLat: route.workLat,
      workLng: route.workLng,
      homeLat: route.homeLat,
      homeLng: route.homeLng,
    });
    console.log("Route meta migrated");
  }

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
