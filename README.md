# WienWasGeht — Real-Time Spatial Event Discovery for Vienna

A privacy-focused, full-stack web application designed to aggregate, normalize, enrich, and map live events happening across Vienna, Austria (Today & Tomorrow).

Live Demo: [wienwasgeht.at](https://wienwasgeht.at)

---

## Overview

Finding out what is happening in Vienna today or tomorrow usually requires checking half a dozen fragmented platforms: club listings on Resident Advisor and ohschonhell.at, municipal cultural calendars, underground concert listings, theater feeds, editorial guides, and ticketing portals.

WienWasGeht solves this by running an automated ingestion engine that pulls from 9 data sources across a rolling 48-hour window, normalizes heterogeneous schemas, classifies categories using Gemini 2.5 Flash, and serves the results on a fast, responsive map interface with zero client-side tracking.

---

## System Architecture

```
[ Data Sources ]
  - City of Vienna Open Data (data.wien.gv.at)
  - Kultursommer Wien (Official festival API)
  - Luma (lu.ma/vienna - Tech meetups, run clubs, community talks)
  - ohschonhell.at (Vienna electronic & club culture)
  - Capeet (Underground concert & indie gig feed)
  - eintrittfrei.at (Curated free Vienna culture & open airs)
  - Resident Advisor (GraphQL API)
  - Eventbrite API
  - Eventfrog Public API
  - Goodnight.at (Editorial city feed)
  - events.at (Aggregated portal feed)
  - Ticketmaster Discovery API
          │
          ▼
[ Ingestion & Normalization Layer (NestJS 11) ]
  - Schema mapping to unified Event model
  - Automated 48h retention & ongoing multi-day event preservation
  - Gemini 2.5 Flash batch classification (with heuristic fallback)
          │
          ▼
[ Persistence Layer ]
  - PostgreSQL + PostGIS spatial indexing
  - Prisma ORM with atomic batch upserts
          │
          ▼
[ REST API & Cache ]
  - GET /api/v1/events?date=today|tomorrow|all
  - Fast response time (< 50ms for active payload)
          │
          ▼
[ Frontend PWA (Next.js 16 / React 19) ]
  - Interactive Leaflet map with marker clustering
  - Co-located venue pin micro-offsetting algorithm
  - Pure client-side proximity calculations (Haversine formula)
  - 0ms client-side toggling between Today and Tomorrow
  - Bilingual localization (German & English)
```

---

## Key Engineering Highlights

### 1. Multi-Source Ingestion & Deduplication
- Pulls from REST APIs, GraphQL endpoints, and structured HTML parsers across 9 verified providers.
- Composite unique constraints (`externalId` + `provider`) prevent duplicate entries across repeated cron runs.
- Daily automated retention cron prunes expired events while preserving active ongoing multi-day exhibitions and festivals.

### 2. Multi-Day & Tomorrow Event Discovery
- Instant client-side filtering via `[ HEUTE ]` and `[ MORGEN ]` chips with dynamic temporal badge indicators (`[ LIVE ]`, `[ MORGEN ]`, `[ UPCOMING ]`).
- Full backend support for querying specific temporal windows (`/api/v1/events?date=today|tomorrow|all`).

### 3. LLM Categorization with Deterministic Fallbacks
- Uses Google Gemini 2.5 Flash in structured batches to categorize unstructured titles and descriptions into canonical categories (`Music`, `Culture`, `Nightlife`, `Culinary`, `Sports`, `Family`).
- Automatically falls back to a fast, localized keyword heuristic when no API key is configured or on rate limits.

### 4. Geometric Micro-Offsetting for Co-Located Events
- Venues with multiple simultaneous events (e.g. festivals, multi-hall clubs) typically collapse onto identical GPS coordinates.
- An angle-distributed micro-offsetting algorithm projects co-located pins into an equidistant 15m radius around the venue center, allowing individual pins to be clicked directly without clumsy spiderfy lines.

### 5. Privacy-First Proximity Awareness
- Complies strictly with GDPR / Austrian data privacy standards.
- User GPS coordinates are processed exclusively in the browser using the Haversine distance formula and are never transmitted to or logged on any server.

### 6. Mobile Layout & PWA Optimization
- Dynamic viewport units (`100dvh`) and container constraints eliminate mobile browser toolbar overflow.
- Elevated floating view switcher (`Karte` / `Liste`) with high z-index and compact map credits prevent touch target collisions.

---

## Tech Stack

| Layer | Technologies |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, Vanilla CSS Design System, Leaflet, Vitest |
| Backend | NestJS 11, TypeScript, RxJS, Jest |
| Database | PostgreSQL + PostGIS, Prisma ORM 6 |
| AI / Enrichment | Google Gemini 2.5 Flash API |
| Hosting & Deployment | Vercel, Supabase / PostgreSQL |

---

## Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL 15+ (Local or Supabase)

### Setup & Installation

1. **Clone the repository and install dependencies:**
   ```bash
   git clone https://github.com/valentinschnabl/wien-was-geht.git
   cd wien-was-geht
   npm install
   cd frontend && npm install && cd ..
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env
   cp frontend/.env.example frontend/.env.local
   ```
   *Edit `.env` to supply your `DATABASE_URL` and provider keys.*

3. **Initialize the database:**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

4. **Start the backend API (Port 3000):**
   ```bash
   npm run start:dev
   ```

5. **Start the frontend application (Port 3001):**
   ```bash
   cd frontend
   npm run dev
   ```

Open `http://localhost:3001` in your browser.

---

## API Reference

### `GET /api/v1/events`
Returns paginated events with optional filtering.

**Query Parameters:**
- `date` (string) — `today` (default), `tomorrow`, or `all`.
- `free` (boolean) — Filter strictly for admission-free events (`free=true`).
- `category` (string) — Filter by normalized category (`Music`, `Culture`, `Nightlife`, `Sports`, `Culinary`, `Family`).
- `provider` (string) — Filter by source provider (`stadt_wien`, `kultursommer`, `oh_schon_hell`, `capeet`, `eintritt_frei`, `resident_advisor`, `goodnight`, `events_at`, `ticketmaster`, `eventbrite`, `eventfrog`).
- `limit` (number, default: 500) — Max records to return.
- `offset` (number, default: 0) — Pagination offset.

### `GET /api/v1/events/:id`
Returns full metadata for a single event record.

### `POST /api/v1/ingest/trigger`
Manually triggers an immediate ingestion and enrichment cycle across all active data providers.

---

## Testing

The project maintains comprehensive test suites for both backend and frontend:

```bash
# Run backend test suite (NestJS / Jest) — 64 tests
npm run test

# Run frontend test suite (Next.js / Vitest) — 15 tests
cd frontend && npm run test

# Run full project test suite (79 tests)
npm run test && cd frontend && npm run test && cd ..
```

---

## License

This project is licensed under the **PolyForm Noncommercial License 1.0.0**.

You are free to use, modify, study, and share this software for noncommercial, educational, and community purposes. Commercial use or hosting for monetary compensation is prohibited without prior explicit permission from the author.