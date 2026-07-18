/**
 * One-shot: create photos/route_meta tables + public `photos` storage bucket.
 * Uses POSTGRES_URL + service role from env (see DEPLOY.md / Vercel Supabase integration).
 *
 *   npx tsx scripts/setup-supabase.ts
 */

import "dotenv/config";
import { config as loadEnv } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import pg from "pg";

loadEnv({ path: ".env.local", override: true });

const SCHEMA_SQL = `
create table if not exists photos (
  id text primary key,
  lat double precision not null,
  lng double precision not null,
  taken_at timestamptz,
  storage_path text not null,
  thumb_path text not null,
  dither_path text,
  sky_ratio double precision not null default 0,
  cable_density double precision not null default 0,
  tangle double precision not null default 0,
  status text not null default 'approved',
  source text not null default 'upload',
  note text,
  place_name text,
  created_at timestamptz not null default now()
);

create index if not exists idx_photos_status on photos(status);

create table if not exists route_meta (
  id text primary key,
  work_lat double precision not null,
  work_lng double precision not null,
  home_lat double precision not null,
  home_lng double precision not null,
  updated_at timestamptz not null
);
`;

async function main() {
  const databaseUrl =
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL;
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "photos";

  if (!databaseUrl) {
    console.error("Missing POSTGRES_URL / POSTGRES_URL_NON_POOLING");
    process.exit(1);
  }
  if (!supabaseUrl || !serviceKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  console.log("Creating tables…");
  // Supabase pooler certs often fail Node's default CA chain in local scripts.
  const connectionString = databaseUrl.replace(
    /([?&])sslmode=[^&]*/g,
    "$1sslmode=no-verify",
  );
  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  await client.query(SCHEMA_SQL);
  await client.end();
  console.log("Tables ready.");

  const supabase = createClient(supabaseUrl, serviceKey);
  const { data: buckets, error: listErr } = await supabase.storage.listBuckets();
  if (listErr) throw listErr;

  const exists = (buckets ?? []).some((b) => b.name === bucket);
  if (exists) {
    console.log(`Bucket "${bucket}" already exists.`);
  } else {
    console.log(`Creating public bucket "${bucket}"…`);
    const { error } = await supabase.storage.createBucket(bucket, {
      public: true,
      fileSizeLimit: 15 * 1024 * 1024,
      allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/heic"],
    });
    if (error) throw error;
    console.log("Bucket created.");
  }

  console.log("Supabase setup complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
