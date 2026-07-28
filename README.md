# Sakay — Ride-Hailing Platform

A Grab-style ride-hailing platform: Next.js/TypeScript PWA frontend, NestJS
backend with real-time driver tracking over Socket.IO, PostgreSQL+PostGIS
for geospatial queries, Redis for pub/sub and caching, Firebase for auth/
push notifications, and GCash/PayMongo/Stripe for payments.

## Stack

| Layer          | Tech |
|----------------|------|
| Frontend       | Next.js, TypeScript, React, PWA (next-pwa), Leaflet |
| Backend        | Node.js, NestJS, Socket.IO, REST |
| Database       | PostgreSQL, PostGIS, Redis |
| Auth           | Firebase Auth (client) + app-issued JWT (API/sockets) |
| Storage        | Firebase Storage (avatars), Cloudflare R2 (bulk media) |
| Notifications  | Firebase Cloud Messaging |
| Payments       | GCash (via PayMongo), PayMongo, Stripe (optional) |
| Deployment     | Docker, Nginx, GitHub Actions, Ubuntu Server |

## Repo layout

```
apps/
  web/    Next.js frontend (rider + driver PWA)
  api/    NestJS backend (REST + Socket.IO + Prisma)
docker/
  nginx/  Reverse proxy config
.github/workflows/  CI/CD pipeline
docker-compose.yml
.env.example
```

## Local development

**Prerequisites:** Node 20+, Docker, a Firebase project, PayMongo test keys.

```bash
git clone <your-repo-url> sakay && cd sakay
cp .env.example .env                       # fill in DB/Redis/Firebase/PayMongo values
cp apps/web/.env.local.example apps/web/.env.local

# Start Postgres + Redis only, and run the apps directly for fast iteration:
docker compose up -d postgres redis

cd apps/api
npm install
npx prisma db execute --file prisma/enable-postgis.sql   # once, before first migrate
npx prisma migrate dev
npm run start:dev                          # http://localhost:4000

# in a second terminal
cd apps/web
npm install
npm run dev                                # http://localhost:3000
```

Open `http://localhost:3000` for the rider view and `http://localhost:3000/driver`
for the driver view — they talk to the same backend and Socket.IO gateway,
so a ride you request in one will show up live in the other in a real deploy
once matching is wired to the real driver id.

## Full stack via Docker

```bash
docker compose up -d --build
docker compose run --rm api npx prisma migrate deploy
```

This brings up Postgres+PostGIS, Redis, the NestJS API, the Next.js app, and
an Nginx reverse proxy in front of both (`/api/*` and `/realtime/*` → API,
everything else → web).

## Deploying to an Ubuntu server

1. Provision an Ubuntu server, install Docker + Docker Compose.
2. `git clone` this repo into `/srv/sakay` on the server.
3. Copy `.env` onto the server (never commit real secrets).
4. Add three GitHub Actions secrets to the repo: `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`.
5. Push to `main` — `.github/workflows/deploy.yml` builds both apps, SSHes in,
   pulls, rebuilds containers, runs pending Prisma migrations, and restarts
   the stack with zero manual steps.
6. Put a real TLS cert in `docker/nginx/certs/` (e.g. via `certbot`) and
   uncomment the HTTPS server block in `docker/nginx/nginx.conf`.

## What's stubbed vs. production-ready

- **Fare/routing on the frontend** still needs the live OSRM/Nominatim calls
  wired back in on `apps/web/app/page.tsx` (the original single-file prototype
  had this — `distanceKm`/`durationMin` are hardcoded placeholders here).
- **GCash** goes through PayMongo's `source` API — GCash has no simple direct
  merchant API for most businesses, so this is the standard path, not a
  shortcut.
- **Driver matching** in `RidesService.assignDriver` expects a `driverId` to
  already be chosen (e.g. from `findNearbyDrivers`); auto-dispatch logic
  (picking the nearest driver and pushing them the request) isn't wired yet.
- Nothing here has been run against real Firebase/PayMongo/Stripe accounts —
  double-check API version pins before going live.
