# Cable Skies — Project Brief

## One-liner

An interactive artwork that maps suspended electrical cables against the sky — arguing that the denser and messier the wires, the less of the sky remains a shared common good.

## Thesis

Urban overhead infrastructure is usually treated as background noise. *Cable Skies* treats it as the subject: every tangle is a claim on public air, light, and view. By scoring how much wire divides the sky and placing those scores in space (map) and body (3D spine), the work makes an invisible commons visible.

> The more wires cut the sky, the less of it remains a common good.

## Intent

| Goal | How it shows up |
|------|-----------------|
| Document a personal / civic route | Seeded from geotagged ride photos; expandable via public upload |
| Make density felt, not just counted | Metrics drive map marker scale and the 3D cable object’s thickness / length |
| Share an aesthetic language | Black void, Bayer dither, monochrome metrics — Refik Anadol–adjacent, not literal imitation |
| Stay local-first, deploy later | SQLite + filesystem now; Supabase + Vercel documented for free-tier cutover |

## Audience

- People who live under dense overhead wires and rarely “see” them
- Viewers of digital / data art who respond to immersion more than dashboards
- Contributors who can add a photo from their own street
- Curators / collaborators evaluating the piece as an exhibition-ready interactive work

## Experience

### 1. Living map (`/`)

A wireframe city (OpenFreeMap roads as white lines on black) floats over a **dithered sky** that moves with wind-like jets and gyres. Panning and zooming drifts the cloud deck with the ground — the map reads like a surface of the Earth under atmosphere.

- Photo markers use **dithered thumbnails**; size scales with cable density
- Lightbox shows the dithered full image plus monochrome density / tangle / open-sky bars
- Visitors can upload a cable-sky photo (GPS from EXIF, or drop a pin)

### 2. Wire spine (`/spine`)

A full-page immersive Three.js scene: a vertical cable object whose profile is driven by the photo route’s density. Scroll descends the object; drag spins it. Supporting systems:

- Black glossy cable strands
- Dithered parallax clouds (cursor parts them)
- 3D wireframe matrix on the object
- Right-side scroll graph (B&W line charts as a “scrollbar”)
- Left-side science / thesis copy

### 3. Admin (`/admin`)

Password-gated moderation: approve, reject, pending, delete uploads.

## Aesthetic direction

- **Void black** field; white / gray only — no accent color system
- **Bayer ordered dither** for photos and procedural clouds (spine + map)
- **Typography:** Space Grotesk as a free stand-in for Aktiv Grotesk (Anadol site language)
- **UI:** Hairline metrics, square markers, ghost / solid mono buttons — not card dashboards
- Map = line drawing of ground; sky = moving dithered atmosphere

## Data & meaning

Each photo is scored locally (heuristics on the image):

| Metric | Meaning |
|--------|---------|
| **Cable density** | How much wire fills the frame |
| **Tangle** | How knotted / crossed the lines feel |
| **Open sky** | How much unbroken sky remains |

These scores feed markers, lightbox readouts, and the spine’s geometry (wider / denser where the sky is more contested).

## Content pipeline

1. Source images in `assets/` (HEIC ride photos with EXIF GPS)
2. `npm run ingest` → JPEG conversion, GPS extract, density score, Bayer dither full + thumb, SQLite seed
3. Public uploads follow the same process via `/api/photos`
4. Color originals are kept as archive; **dithered** versions are the primary display

## Technical overview

| Layer | Choice |
|-------|--------|
| App | Next.js (App Router), TypeScript, Tailwind |
| Map | MapLibre + custom line-only OpenFreeMap style + WebGL dither sky |
| 3D | three.js via React Three Fiber + drei |
| Local data | SQLite (`data/cable-skies.sqlite`) + `data/uploads` / `data/thumbs` |
| Prod path (docs) | Vercel + Supabase (Postgres + Storage) — see `DEPLOY.md` |

### Key routes

| Route | Role |
|-------|------|
| `/` | Landing (dither sky · hover title → Start) |
| `/map` | Map + upload + lightbox |
| `/spine` | Immersive density object |
| `/admin` | Moderation |
| `/api/photos` | List / create |
| `/api/media/...` | Serve local files |

## Current status

**Working local prototype** with:

- ~60 seeded geotagged photos from a work→home corridor
- Dither pipeline, map sky, line basemap, spine immersion, upload + admin
- Deploy path documented but not required for local presentation

## Success looks like

- A first-time visitor understands the thesis within one viewport on the map
- Density is *felt* in the spine without reading a legend first
- New photos can enter the archive without breaking the aesthetic (everything dithered, mono UI)
- The piece can be shown locally (laptop / gallery machine) and later published on a free stack without redesign

## Out of scope (for now)

- Real-time multiplayer or social feed
- ML cable segmentation (current scores are heuristic)
- Paid map / tile APIs
- Native mobile apps

## How to run (local)

```bash
npm install
cp .env.example .env.local
npm run ingest
npm run dev
```

Open `http://localhost:3000` (map) and `/spine` (object).

---

*Cable Skies* — interactive artwork · map · spine · dithered archive
