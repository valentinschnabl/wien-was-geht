# WienWasGeht — Real-Time Spatial Event Discovery for Vienna

A privacy-focused, full-stack web application designed to aggregate, normalize, enrich, and map live events happening across Vienna, Austria on any given day.

Live Demo: [wienwasgeht.at](https://wienwasgeht.at)

---

## Overview

Finding out what is happening in Vienna today usually requires checking half a dozen fragmented platforms: club listings on Resident Advisor, municipal cultural calendars, theater feeds, editorial guides, and ticketing portals.

WienWasGeht solves this by running an automated ingestion engine that pulls from 7 data sources every morning, normalizes heterogeneous schemas, classifies categories using Gemini 2.5 Flash, and serves the results on a fast, responsive map interface with zero client-side tracking.

---

## System Architecture

```
[ Data Sources ]
  - City of Vienna Open Data (data.wien.gv.at)
  - Resident Advisor (GraphQL API)
  - Goodnight.at (Scraped editorial feed)
  - events.at (Aggregated portal feed)
  - Ticketmaster Discovery API
  - Eventbrite API
  - Eventfrog Public API
          │
          ▼
[ Ingestion & Normalization Layer (NestJS 11) ]
  - Schema mapping to unified Event model
  - Automated 24h retention & expired event pruning
  - Gemini 2.5 Flash batch classification (with heuristic fallback)
          │
          ▼
[ Persistence Layer ]
  - PostgreSQL + PostGIS spatial indexing
  - Prisma ORM with atomic batch upserts
          │
          ▼
[ REST API & Cache ]
  - GET /api/v1/events?today=true
  - Fast response time (< 50ms for today's payload)
          │
          ▼
[ Frontend PWA (Next.js 16 / React 19) ]
  - Interactive Leaflet map with marker clustering
  - Co-located venue pin micro-offsetting algorithm
  - Pure client-side proximity calculations (Haversine formula)
  - Bilingual localization (German & English)
```

---

## Key Engineering Highlights

### 1. Multi-Source Ingestion & Deduplication
- Pulls from REST APIs, GraphQL endpoints, and structured HTML parsers.
- Composite unique constraints (`externalId` + `provider`) prevent duplicate entries across repeated cron runs.
- Daily automated retention cron prunes expired events to keep database queries lightweight and sub-50ms.

### 2. LLM Categorization with Deterministic Fallbacks
- Uses Google Gemini 2.5 Flash in structured batches to categorize unstructured titles and descriptions into canonical categories (`Music`, `Culture`, `Nightlife`, `Culinary`, `Sports`, `Family`).
- Automatically falls back to a fast, localized keyword heuristic when no API key is configured or on rate limits.

### 3. Geometric Micro-Offsetting for Co-Located Events
- Venues with multiple simultaneous events (e.g. festivals, multi-hall clubs) typically collapse onto identical GPS coordinates.
- An angle-distributed micro-offsetting algorithm projects co-located pins into an equidistant 15m radius around the venue center, allowing individual pins to be clicked directly without clumsy spiderfy lines.

### 4. Privacy-First Proximity Awareness
- Complies strictly with GDPR / Austrian data privacy standards.
- User GPS coordinates are processed exclusively in the browser using the Haversine distance formula and are never transmitted to or logged on any server.

### 5. iOS Safari & Mobile PWA Engineering
- Implemented with dynamic viewport units (`100dvh`) and container constraints to eliminate the classic iOS Safari toolbar overflow bug.
- Inertial touch scrolling (`-webkit-overflow-scrolling: touch`) and safe-area insets guarantee seamless mobile performance.

---

## Tech Stack

| Layer | Technologies |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, Vanilla CSS Design System, Leaflet, Vitest |
| Backend | NestJS 11, TypeScript, RxJS, Jest |
| Database | PostgreSQL + PostGIS, Prisma ORM 6 |
| AI / Enrichment | Google Gemini 2.5 Flash API |
| Infrastructure | Docker, Docker Compose, Vercel |

---

## Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL 15+ (or Docker)

### Option A: Running with Docker Compose (Recommended)

Start the full stack (PostgreSQL + PostGIS, NestJS API, Next.js Frontend) in one command:

```bash
docker compose up --build
```

- Frontend: `http://localhost:3001`
- Backend API: `http://localhost:3000`
- Database: `localhost:5432`

---

### Option B: Manual Local Setup

1. **Clone the repository and install dependencies:**
   ```bash
   git clone https://github.com/valentinschnabl/vienna-event-map.git
   cd vienna-event-map
   npm install
   cd frontend && npm install && cd ..
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env
   cp frontend/.env.example frontend/.env.local
   ```

3. **Initialize the database:**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

4. **Start the backend (Port 3000):**
   ```bash
   npm run start:dev
   ```

5. **Start the frontend (Port 3001):**
   ```bash
   cd frontend
   npm run dev
   ```

---

## API Reference

### `GET /api/v1/events`
Returns paginated events with optional filtering.

**Query Parameters:**
- `today` (boolean) — Scopes results to events active today.
- `category` (string) — Filter by normalized category (`Music`, `Culture`, `Nightlife`, `Sports`, `Culinary`, `Family`).
- `provider` (string) — Filter by source provider (`stadt_wien`, `resident_advisor`, `goodnight`, `events_at`, `ticketmaster`, `eventbrite`, `eventfrog`).
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
# Run backend test suite (NestJS / Jest) — 49 tests
npm run test

# Run frontend test suite (Next.js / Vitest) — 15 tests
cd frontend && npm run test

# Run full project test suite
npm run test && cd frontend && npm run test && cd ..
```

Test coverage includes:
- Ingestion providers & error resilience (handling timeouts, malformed HTML, offline APIs)
- AI categorizer & keyword heuristic fallback paths
- Spatial micro-offset math and Haversine distance computations
- Temporal event status classification (Live / Upcoming / Concluded)
- Bilingual i18n dictionary completeness

---

## License

MIT License. Developed for the Vienna community.