/**
 * Delete photos (DB + storage) by id from Supabase.
 * Usage: npx tsx scripts/delete-photos.ts <id> [<id>...]
 */

import "dotenv/config";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local", override: true });

async function main() {
  const ids = process.argv.slice(2).filter((a) => !a.startsWith("-"));
  if (ids.length === 0) {
    console.error("Usage: npx tsx scripts/delete-photos.ts <id> [<id>...]");
    process.exit(1);
  }

  process.env.STORAGE_BACKEND = "supabase";
  const { createSupabaseDb } = await import("../src/lib/db/supabase");
  const { createSupabaseStorage } = await import("../src/lib/storage/supabase");

  const db = createSupabaseDb();
  const storage = createSupabaseStorage();

  for (const id of ids) {
    const photo = await db.getPhoto(id);
    if (!photo) {
      console.error(`not found: ${id}`);
      continue;
    }
    await storage.remove(photo.storagePath);
    await storage.remove(photo.thumbPath);
    if (photo.ditherPath) await storage.remove(photo.ditherPath);
    await db.deletePhoto(id);
    console.log(`deleted ${id} (${photo.placeName ?? "no place"})`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
