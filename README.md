# Health Tracker

A personal health management app for tracking medical visits, medications, vaccinations, and health conditions across multiple family members (profiles).

## Features

- **Profiles** — manage multiple health profiles (family members); share read/write access with others
- **Visits** — track scheduled, completed, and pending appointments with doctors and facilities
- **Medications** — log active/inactive medications with dose history and per-dose notes
- **Conditions** — track diagnoses with status (Active / Monitoring / Resolved / Incidental)
- **Allergies** — record allergen reactions with category, wheal size, and diagnosis date
- **Health Metrics** — log standalone measurements (weight, blood sugar, blood pressure, etc.) with trend charts
- **Vaccinations** — record vaccinations and compare against CDC recommended schedule
- **Healthcare Team** — manage doctors and facilities; link locations to facilities
- **Calendar feed** — subscribe to upcoming appointments via webcal/iCal in any calendar app
- **Import / Export** — full profile data export to JSON; re-import with append, skip-duplicates, or replace modes
- **Audit log** — immutable log of all create/update/delete operations, viewable per profile
- **API documentation** — built-in Swagger UI at `/account/api-docs` with full OpenAPI spec

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 App Router |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Database | PostgreSQL (Neon) via Prisma |
| Auth | NextAuth.js v5 — Google OAuth |
| Validation | Zod v4 |
| Rate limiting | Upstash Redis (optional) |
| Tests | Vitest |

## Setup

### 1. Clone and install

```bash
git clone <repo>
cd health-tracker
npm install
```

### 2. Environment variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

Required variables:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Neon pooled connection string (for Prisma queries) |
| `DIRECT_URL` | Neon direct connection string (for migrations) |
| `AUTH_SECRET` | Random secret for NextAuth — generate with `openssl rand -base64 32` |
| `AUTH_URL` | Your app's base URL (e.g., `http://localhost:3000`) |
| `AUTH_GOOGLE_ID` | Google OAuth client ID |
| `AUTH_GOOGLE_SECRET` | Google OAuth client secret |

Optional:

| Variable | Description |
|----------|-------------|
| `UPSTASH_REDIS_REST_URL` | Upstash Redis URL for rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis token |
| `CRON_SECRET` | Secret for the `/api/cdc/refresh` cron endpoint |

### 3. Database

```bash
npx prisma migrate deploy   # apply migrations
npx prisma generate         # generate Prisma client
```

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm test` | Run Vitest unit tests |
| `npm run build` | `prisma generate` → `prisma migrate deploy` → `vitest run` → `next build` |
| `npm run db:migrate` | Create and apply a new Prisma migration (dev only) |
| `npm run db:studio` | Open Prisma Studio to browse the database |

## Project Structure

```
src/
  app/
    (app)/          # Authenticated app pages (dashboard, visits, medications, …)
    api/            # REST API route handlers
  components/       # React UI components
  lib/              # Pure utilities (cdc.ts, format.ts, validation.ts, …)
  server/           # Server-side data access functions (permissions enforced here)
prisma/
  schema.prisma     # Database schema
data/
  cdc-schedule.json # CDC vaccination schedule (update via /api/cdc/refresh)
```

## API Overview

All endpoints require authentication. Profile-scoped endpoints require a `profileId` query parameter.

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/profiles` | List / create profiles |
| GET/PUT/DELETE | `/api/profiles/[id]` | Get / update / delete profile |
| GET | `/api/profiles/[id]/export` | Export full profile data as JSON |
| POST | `/api/profiles/[id]/import` | Import profile data (modes: append, skip_duplicates, replace) |
| GET/POST | `/api/visits` | List / create visits |
| GET/PUT/DELETE | `/api/visits/[id]` | Get / update / delete visit |
| GET/POST | `/api/medications` | List / create medications |
| GET/PUT/DELETE | `/api/medications/[id]` | Get / update / delete medication |
| POST | `/api/medications/[id]/logs` | Log a medication dose |
| GET/POST | `/api/conditions` | List / create conditions |
| GET/PUT/DELETE | `/api/conditions/[id]` | Get / update / delete condition |
| GET/POST | `/api/allergies` | List / create allergy records |
| GET/PUT/DELETE | `/api/allergies/[id]` | Get / update / delete allergy |
| GET/POST | `/api/health-metrics` | List / create health measurements |
| GET/PUT/DELETE | `/api/health-metrics/[id]` | Get / update / delete health metric |
| GET/POST | `/api/vaccinations` | List / create vaccinations |
| GET | `/api/vaccinations/recommendations` | CDC compliance recommendations for a profile |
| GET/POST | `/api/doctors` | List / create doctors |
| GET/PUT/DELETE | `/api/doctors/[id]` | Get / update / delete doctor |
| GET/POST | `/api/facilities` | List / create facilities |
| GET/PUT/DELETE | `/api/facilities/[id]` | Get / update / delete facility |
| GET | `/api/profiles/[id]/access` | List users with access to a profile |
| POST/PUT/DELETE | `/api/profiles/[id]/access` | Grant / update / revoke profile access |
| GET | `/api/calendar/[profileId]` | iCal calendar feed (authenticated via token) |
| GET | `/api/openapi` | OpenAPI spec JSON (also viewable at `/account/api-docs`) |
| POST | `/api/cdc/refresh` | Refresh CDC schedule data (requires `CRON_SECRET`) |
