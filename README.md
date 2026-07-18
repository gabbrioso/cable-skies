# Cable Skies

Interactive artwork mapping suspended electrical cables against the sky. Explore a living map of geotagged photos, contribute your own, and enter a **Three.js** wire spine where place runs along X and cable density thickens the strands.

## Local setup

```bash
npm install
cp .env.example .env.local
npm run ingest          # convert assets/*.HEIC → JPEG, score density, seed SQLite
npm run dev             # http://localhost:3000
```

| Route | Purpose |
|-------|---------|
| `/` | Landing (hover title → Start) |
| `/map` | Living map |
| `/spine` | Three.js / R3F interactive wire spine |
| `/admin` | Moderate uploads (password from `ADMIN_PASSWORD`) |

## Scripts

- `npm run ingest` — seed from `assets/`
- `npm run db:init` — create empty SQLite DB
- `npm run migrate:supabase` — push local data to Supabase (see [DEPLOY.md](DEPLOY.md))

## Stack

- Next.js (App Router) + TypeScript
- MapLibre GL (OpenFreeMap line basemap + dither sky)
- Amstelvar (headings/CTAs) + Bellefair (body)
- **three.js** via `@react-three/fiber` + `@react-three/drei` on `/spine`
- SQLite + local `data/` storage (local-first)
- Supabase adapters ready for free production hosting

## Thesis

The more wires cut the sky, the less of it remains a common good.
