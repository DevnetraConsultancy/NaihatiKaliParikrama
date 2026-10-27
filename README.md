# NaihatiKaliParikrama

**নৈহাটি কালীপূজা পরিক্রমা** — a live Kali Puja pandal map for **Naihati, North 24 Parganas**.

A visitor scans the QR code on a roadside banner, opens this app, allows location, and immediately sees:

- **where they are** (live blue dot) and **which pandal is next** (distance + walking time),
- **three pandal categories** on the map — Heritage, Large and Small,
- **walking and driving routes** with step-by-step directions and ETAs that stretch when the area is crowded,
- **how busy it is right now** (visitor check-ins blended with a time-of-night model),
- **nearby hospitals, police stations, toilets, food, pharmacies, parking and helplines**.

Built mobile-first for Android, Bengali-first with an English toggle, and deliberately free of API keys so
it can be deployed and handed to volunteers.

---

## Stack

| Piece | Choice | Why |
| --- | --- | --- |
| Framework | Next.js 16 (App Router) + React 19 + TypeScript | Deploys to Vercel with zero config |
| Styling | Tailwind CSS v4 | Small CSS, easy theming |
| Map | Leaflet + OpenStreetMap raster tiles | No API key, no billing |
| Routing / ETA | OSRM (walking + driving profiles) | Free, open source, no key |
| Facilities | OpenStreetMap Overpass API, cached in Postgres | Live data without hand-maintaining every toilet |
| Database | Neon Postgres (`@neondatabase/serverless`) | Your chosen database; serverless HTTP driver |
| Hosting | Vercel | Auto-deploy on every `git push` |

No secrets are needed for the map, routing or facility data. Only Neon and the admin password are required.

---

## Getting started locally

```bash
npm install
cp .env.example .env.local     # fill in what you have, everything is optional to boot
npm run dev                    # http://localhost:3000
```

The app runs **without any environment variables**: it serves the bundled pandal list from
`src/data/pandals.seed.json`, uses the bundled Naihati landmarks for the Help screen, and keeps crowd
reports in the server process memory.

### Environment variables

| Name | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | optional (recommended) | Neon pooled connection string. Without it the app runs read-only on bundled data. |
| `ADMIN_PASSWORD` | for `/admin` | Password for the pandal editor. Minimum 6 characters. |
| `NEXT_PUBLIC_SAMPLE_DATA` | optional | `1` shows a “sample data” banner and marks unverified pins as approximate. |
| `NEXT_PUBLIC_TILE_URL` | optional | Override the tile source (e.g. MapTiler) if you outgrow OSM tiles. |
| `NEXT_PUBLIC_TILE_ATTRIBUTION` | optional | Attribution for a custom tile source. |
| `OSRM_BASE_URL` | optional | Point at your own OSRM instance if the public demo server is too slow during the festival. |

---

## Database setup (Neon)

1. Create a project at [neon.tech](https://neon.tech) (free tier is plenty for this).
2. Copy the **pooled** connection string (Neon dashboard → Connect).
3. Locally: put it in `.env.local` as `DATABASE_URL=postgresql://…`.
4. Create the tables and load the bundled data:

   ```bash
   npm run db:migrate
   npm run db:seed
   ```

   Or, after deploying: set `ADMIN_PASSWORD` in Vercel, open `/admin`, unlock it and press
   **“Create tables & seed data”** — the same schema and seed run from the browser.

Tables created: `pandals`, `crowd_reports`, `facilities`, `route_cache`.

---

## Deploying to Vercel

1. Push this repository to GitHub (the connected repo is already wired for this project).
2. In Vercel: **Add New → Project → Import** the repository. Framework is detected as Next.js; keep the
   default build settings.
3. Add environment variables (Project → Settings → Environment Variables):
   `DATABASE_URL`, `ADMIN_PASSWORD`, optionally `NEXT_PUBLIC_SAMPLE_DATA`.
4. Deploy. Every later `git push` produces a new deployment automatically.
5. Open `/api/health` on the deployment to confirm: `database: true`, `pandalCount: 28`.
6. Open `/admin` and run the database initialisation once.

---

## QR code for the roadside banner

Point the QR code at your deployed **`/map`** URL. Useful deep links:

| URL | Opens |
| --- | --- |
| `/map` | Full-screen live map with your position and the next pandal |
| `/map?pandal=naihati-boromaa-kali-puja` | A specific pandal, ready for routing |
| `/map?cat=heritage` | Only heritage pandals |
| `/map?stops=a,b,c` | A full multi-stop parikrama route |
| `/plan` | Itinerary builder (pick pandals, optimise order, open on the map) |
| `/help` | Nearest hospital, police, toilet, food and helplines |

---

## Pandal data: what is verified and what is not

`src/data/pandals.seed.json` ships with **28 pandals** (7 heritage, 11 large, 10 small). Each entry has a
`verified` flag:

- `verified: true` — the pandal is documented in public sources (for example **Naihati Boro Maa**).
- `verified: false` — the name or pin still needs a local check. These use **real Naihati localities and
  landmark coordinates taken from OpenStreetMap** (the Athletic Club ground, Lichu Bagan, Kalimandir Ghat,
  the post office para, the station road and so on), but the committee name and exact pin must be confirmed
  on the ground.

Unverified pins are labelled “approximate” in the UI so a visitor is never told a wrong location is exact.
Before the festival, open `/admin`, walk the list, and correct names and pins by clicking the map.

The facility fallback list in `src/data/facilities.seed.json` contains only real, named places with their
OpenStreetMap coordinates, plus the standard emergency helpline numbers.

---

## How the crowd level works (and what it is not)

1. Visitors tap a one-tap check-in at a pandal: **ফাঁকা / মাঝারি / ভিড় / খুব ভিড়**.
2. Reports stay relevant for an hour and are weighted by freshness.
3. If nobody has reported, a time-of-night model is used — footfall builds after dusk, peaks between
   22:00 and midnight (IST) and falls away after 02:00.
4. The walking ETA slows down as the crowd grows, so routes stay realistic in a packed lane.
5. One report per pandal per device per 20 minutes; the visitor's IP is hashed and never stored.

**This is a community estimate, not official footfall data.** No free live crowd feed exists for Naihati;
if the municipality ever publishes one, it can replace the model in `src/lib/crowd.ts`.

---

## Project layout

```
src/app/                 routes: / (home), /map, /pandals, /plan, /help, /about, /admin
src/app/api/             pandals, crowd, route (OSRM proxy), nearby (Overpass), admin/*
src/components/          AppHeader, TabBar, page content components
src/components/map/      LeafletCanvas (imperative Leaflet) + MapExperience (the map app)
src/lib/                 types, geo maths, crowd model, search, i18n, db, repo, overpass, osrm, auth
src/data/                seed pandals + verified Naihati facilities
scripts/                 db-migrate.mjs, db-seed.mjs
```

### API endpoints

| Endpoint | Method | Notes |
| --- | --- | --- |
| `/api/health` | GET | Deployment probe: database state, counts, admin configured |
| `/api/pandals` | GET | `?category=&q=&near=lat,lng&limit=` — includes current crowd level |
| `/api/crowd` | GET | `?slugs=a,b,c` — crowd levels plus the area average |
| `/api/crowd` | POST | `{slug, level}` — one check-in per device per 20 minutes |
| `/api/route` | GET | `?points=lat,lng\|lat,lng&profile=foot\|car` — OSRM proxy with caching |
| `/api/nearby` | GET | `?lat&lng&radius&kinds=` — OSM facilities, cached in Postgres |
| `/api/admin/login` \| `/logout` | POST | Password gate for `/admin` |
| `/api/admin/pandals` | GET/POST/DELETE | Pandal editor API (cookie-protected) |
| `/api/admin/setup` | POST | Applies the schema and seeds data (cookie-protected) |

---

## Checks that were run

- `npx tsc --noEmit` — clean.
- `npm run build` — 9 pages and 8 API routes, production build clean.
- Live HTTP checks against `next dev`: every page returns 200 with Bengali copy; `/api/health` reports 28
  pandals; category filter, tolerant search (`boromaa` → Boro Maa) and nearest-first ordering work.
- Crowd model verified per IST hour: 15:00 → level 1, 18:30 → 2, 20:00 → 3, 23:00 → 4, 01:00 → 3,
  03:30 → 2.
- Crowd report endpoint: valid report accepted, repeat rejected `429`, foreign origin `403`, unknown pandal
  `404`, bad level `400`.
- Routing: live OSRM walking route (station → Naihati State General Hospital, 2 339 m / 30 min, 8 steps,
  bilingual directions), cached repeats, multi-stop legs, and validation rejects swapped coordinates.
- Admin gate: `401` without a cookie, `401` on a wrong password, session cookie on success, `503` for
  writes while `DATABASE_URL` is absent.
- SQL verified against an in-memory Postgres: schema applies and is idempotent, 28 pandals seed, admin
  upsert works, crowd FK and the level check constraint are enforced, the bbox+kind facility query works,
  the jsonb route cache round-trips, and deleting a pandal cascades its crowd reports.

### Not verified here (needs you)

- **Browser rendering on a real phone.** Visual layout, Leaflet tiles, geolocation permission flow and
  hydration could not be exercised in this environment. Open the preview and check the map, the permission
  prompt and the bottom sheet.
- **The live Overpass/OSM facility path.** Every Overpass mirror was unreachable from the build environment,
  so the app correctly served the bundled landmark list instead. On a normal network you should see
  `source: "osm"` from `/api/nearby`.
- **Neon against the real service.** SQL was validated on an in-memory Postgres; the first real Neon run is
  the `/admin` → “Create tables & seed data” step.

---

## Limitations and the plan for high traffic

- **OSRM demo server** is rate limited and shared. A cache (memory + Neon, 1 day) sits in front of it, but
  for serious festival traffic set `OSRM_BASE_URL` to your own instance or a keyed directions provider.
- **OpenStreetMap tile usage policy** does not allow heavy production traffic. If the app gets busy, sign up
  for a tile provider and set `NEXT_PUBLIC_TILE_URL` + `NEXT_PUBLIC_TILE_ATTRIBUTION`.
- **Crowd reports without a database** live in a single serverless instance's memory. Configure Neon so
  reports are shared by everyone.
- This is a **community helper**, not an official Naihati Municipality application.
