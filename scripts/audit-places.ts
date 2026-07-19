/**
 * Audit place names against credible-city rules.
 *
 * Offline rules: npm run places:check
 * Live archive:  npx tsx scripts/audit-places.ts [--url https://cable-skies.vercel.app]
 * Local Supabase: npx tsx scripts/audit-places.ts --supabase
 */

import "dotenv/config";
import { config as loadEnv } from "dotenv";
import {
  extractCity,
  isCrediblePlaceName,
} from "../src/lib/geo/city";

loadEnv({ path: ".env.local", override: true });

type PhotoRow = { id: string; placeName?: string | null };

async function loadFromUrl(baseUrl: string): Promise<PhotoRow[]> {
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/api/photos`);
  if (!res.ok) throw new Error(`GET /api/photos → ${res.status}`);
  const data = (await res.json()) as { photos: PhotoRow[] };
  return data.photos ?? [];
}

async function loadFromSupabase(): Promise<PhotoRow[]> {
  const { createSupabaseDb } = await import("../src/lib/db/supabase");
  const db = createSupabaseDb();
  const photos = await db.listPhotos("all");
  return photos.map((p) => ({ id: p.id, placeName: p.placeName }));
}

async function main() {
  const args = process.argv.slice(2);
  const urlIdx = args.indexOf("--url");
  const useSupabase = args.includes("--supabase");
  const baseUrl =
    urlIdx >= 0
      ? args[urlIdx + 1]
      : !useSupabase
        ? "https://cable-skies.vercel.app"
        : null;

  const photos = useSupabase
    ? await loadFromSupabase()
    : await loadFromUrl(baseUrl!);

  const bad = photos.filter((p) => !isCrediblePlaceName(p.placeName));
  const cities = new Map<string, number>();
  for (const p of photos) {
    const city = extractCity(p.placeName);
    cities.set(city, (cities.get(city) ?? 0) + 1);
  }

  console.log(`Audited ${photos.length} photos`);
  console.log(
    "Cities:",
    Object.fromEntries([...cities.entries()].sort((a, b) => b[1] - a[1])),
  );

  if (bad.length === 0) {
    console.log("All place names are credible.");
    return;
  }

  console.error(`\n${bad.length} non-credible place name(s):`);
  for (const p of bad) {
    console.error(`  ${p.id} → ${p.placeName ?? "(empty)"} [${extractCity(p.placeName)}]`);
  }
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
