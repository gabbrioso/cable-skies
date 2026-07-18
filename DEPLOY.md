# Deploy Cable Skies (free tier)

Local development uses SQLite + `data/uploads`. When you publish, use this cutover.

## Free stack

| Piece | Service | Notes |
|-------|---------|--------|
| App | [Vercel Hobby](https://vercel.com/pricing) | Next.js hosting |
| DB + storage | [Supabase free](https://supabase.com/pricing) | Postgres + Storage (~1 GB) |
| Map tiles | OpenFreeMap vector (line-only style) via MapLibre | No API key |
| 3D | three.js (client-side) | No server cost |

## 1. Create Supabase project

1. Create a free project at supabase.com.
2. Storage → New bucket `photos` → **Public**.
3. SQL editor → run:

```sql
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
```

4. Copy Project URL, `anon` key, and `service_role` key.

## 2. Migrate local data (optional)

With local SQLite already seeded:

```bash
# in .env.local or shell:
set STORAGE_BACKEND=supabase
set NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
set NEXT_PUBLIC_SUPABASE_ANON_KEY=...
set SUPABASE_SERVICE_ROLE_KEY=...
set SUPABASE_STORAGE_BUCKET=photos

npm run migrate:supabase
```

## 3. Deploy to Vercel

1. Push the repo to GitHub.
2. Import the project on Vercel.
3. Set environment variables:

```
STORAGE_BACKEND=supabase
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_STORAGE_BUCKET=photos
ADMIN_PASSWORD=choose-a-strong-password
AUTO_APPROVE_UPLOADS=true
```

4. Deploy. Open the Vercel URL → map + `/spine` (Three.js) + `/admin`.

## Limits to expect

- Supabase free: project may pause if idle; ~1 GB file storage.
- Vercel Hobby: serverless duration/bandwidth limits — fine for an art site.
- If the archive grows past free storage, add Cloudflare R2 later or prune rejected uploads.

## Do not deploy until ready

This doc is the cutover checklist only. Keep developing with `npm run dev` locally until you explicitly want to go live.
