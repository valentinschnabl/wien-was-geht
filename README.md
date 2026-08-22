# WienWasGeht — Real-Time Spatial Event Discovery for Vienna

A privacy-focused, full-stack web application designed to aggregate, normalize, enrich, and map live events happening across Vienna, Austria (Today & Tomorrow).

Live Platform: [wienwasgeht.at](https://wienwasgeht.at)

---

## Overview

Finding out what is happening in Vienna today or tomorrow usually requires checking dozens of fragmented platforms: club listings on Resident Advisor and ohschonhell.at, direct club and open-air concert programs (Arena Wien, Flex, Viper Room, O-Klub, Prater Dome), municipal cultural calendars, outdoor fitness sessions (Bewegt im Park), running races (Wienläuft), underground concert listings, tech & community meetups, theater feeds, editorial guides, and ticketing portals.

**WienWasGeht** solves this by running an automated ingestion engine that pulls from **17 verified data sources** across a rolling 48-hour window, normalizes heterogeneous schemas, classifies categories and resolves physical GPS coordinates using Google Gemini Flash, and serves the results on a fast, responsive map interface with zero client-side tracking.

---

## System Architecture

```
[ 17 Integrated Data Sources ]
  - City of Vienna Open Government Data (data.wien.gv.at)
  - Bewegt im Park (bewegt-im-park.at - Free outdoor sports & fitness courses across all 23 districts)
  - Wienläuft (wienlaeuft.at - Running races & community running events)
  - Rausgegangen Wien (rausgegangen.com/at/wien - Curated daily tips & exhibitions)
  - WARDA (warda.at - Vienna lifestyle, nightlife & open-air events)
  - Vienna Club & Live Stage Feeds (Arena Wien, Flex, Viper Room, O-Klub, Prater Dome, Babenberger Passage, VIE i PEE, USUS am Wasser, Schikaneder, Flucc, DonauTechno, Celeste, B72, Rhiz, WUK, Gasometer Planet.tt, Jazzland, Zwe, Frau Mayer, Cabaret Fledermaus, Tanzcafé Jenseits, Cafe Carina, Café Concerto, Zum Martin Sepp, Museumsquartier, Afrika Tage, Szene Wien)
  - Luma Vienna (lu.ma/vienna - Tech meetups, runs, talks)
  - Resident Advisor (ra.co - Electronic & club nights)
  - ohschonhell.at (Vienna electronic & club culture)
  - Capeet (Underground concert & indie gig feed)
  - eintrittfrei.at (Curated free Vienna culture & open airs)
  - Kultursommer Wien (Official festival API)
  - Eventbrite API (Vienna region)
  - Eventfrog Public API (Vienna metro area)
  - Ticketmaster Discovery API (Austria / Vienna)
  - Goodnight.at (Editorial city feed)
  - events.at (Aggregated portal feed)
          │
          ▼
[ Ingestion & Normalization Layer (NestJS 11) ]
  - Modular Provider Adapters with isolated error handling (Promise.allSettled)
  - Schema mapping to unified Event model & deterministic pricing detection
  - Automated 48h active retention & ongoing multi-day event preservation
  - Dual-layer Geocoding (150+ in-memory venue centroids + Google Gemini Flash spatial resolution)
  - Google Gemini Flash batch classification (with heuristic fallback)
          │
          ▼
[ Persistence Layer ]
  - PostgreSQL + PostGIS spatial indexing
  - Prisma ORM with atomic batch upserts
          │
          ▼
[ REST API & Cache ]
  - GET /api/v1/events?date=today|tomorrow|all&free=true&category=...
  - Fast response time (< 50ms for active payload)
          │
          ▼
[ Frontend PWA (Next.js 16 / React 19) ]
  - Interactive Leaflet map with Esri Light & Esri Dark Gray Canvas tiles
  - Co-located venue pin micro-offsetting algorithm
  - Pure client-side proximity calculations (Haversine formula)
  - 0ms client-side toggling between Today and Tomorrow
  - Free admission filter ([ GRATIS ])
  - Bilingual localization (German & English)
```

---

## Key Engineering Highlights

### 1. Multi-Source Ingestion & Modular Adapters
- Pulls from REST APIs, GraphQL endpoints, Schema.org JSON-LD, and structured HTML parsers across **17 verified providers**.
- Composite unique constraints (`externalId` + `provider`) prevent duplicate entries across repeated cron runs.
- Daily automated retention cron at 04:00 UTC prunes expired events while preserving active ongoing multi-day exhibitions and festivals within the 48-hour active window.

### 2. Multi-Day & Admission-Free Discovery
- Instant client-side filtering via `[ HEUTE ]`, `[ MORGEN ]`, and `[ GRATIS ]` chips with dynamic temporal badge indicators (`[ JETZT ]`, `[ HEUTE ]`, `[ MORGEN ]`, `[ BEENDET ]`).
- Full backend support for querying specific temporal and pricing windows (`/api/v1/events?date=today|tomorrow|all&free=true`).

### 3. Dual-Layer Geocoding & City Center De-Clustering
- **In-Memory Dictionary:** Over 150+ curated Vienna venues, club locations, and district centroids resolve in 0ms.
- **AI Geocoding:** Unrecognized locations are evaluated by Google Gemini Flash to pinpoint real-world coordinates in Vienna.
- **Out-of-Bounds Isolation:** Events outside Vienna (e.g. festivals in Lower Austria) or without physical locations are assigned `(0, 0)` so they remain cleanly listed in the sidebar without cluttering the map.

### 4. LLM Categorization with Deterministic Fallbacks
- Uses Google Gemini Flash in structured batches to categorize unstructured titles and descriptions into canonical categories (`Music`, `Culture`, `Nightlife`, `Culinary`, `Sports`, `Family`).
- Automatically falls back to a fast, localized keyword heuristic when no API key is configured or on rate limits.

### 5. Geometric Micro-Offsetting for Co-Located Events
- Venues with multiple simultaneous events (e.g. festivals, multi-hall clubs) typically collapse onto identical GPS coordinates.
- An angle-distributed micro-offsetting algorithm projects co-located pins into an equidistant 15m radius around the venue center, allowing individual pins to be clicked directly without clumsy spiderfy lines.

### 6. Privacy-First Proximity Awareness & Hosting
- Complies strictly with GDPR / Austrian DSGVO standards.
- User GPS coordinates are processed exclusively in the browser using the Haversine distance formula and are never transmitted to or logged on any server.
- Web analytics are cookieless, aggregated, and anonymized via Vercel Web Analytics.

### 7. Architectural Light & Dark Mode
- Supports both Light Mode and an architectural Warm Slate Dark Mode (`#191c1a`, `#212522`, `#282d2a`, `#74a86c`) paired with Esri World Dark Gray Canvas map tiles.
- Clean startup default to Light Mode with persistent local preference storage.

---

## Tech Stack

| Layer | Technologies |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, Vanilla CSS Design System, Leaflet, Vitest |
| Backend | NestJS 11, TypeScript, RxJS, Jest |
| Database | PostgreSQL + PostGIS, Prisma ORM 6 |
| AI / Enrichment | Google Gemini Flash API |
| Hosting & Deployment | Vercel (Frontend), Render (Backend API), Supabase (PostgreSQL) |

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
- `provider` (string) — Filter by source provider (`STADT_WIEN`, `BEWEGT_IM_PARK`, `WIENLAEUFT`, `VIENNA_CLUBS`, `LUMA`, `RESIDENT_ADVISOR`, `OH_SCHON_HELL`, `CAPEET`, `EINTRITT_FREI`, `KULTURSOMMER`, `GOODNIGHT`, `WARDA`, `RAUSGEGANGEN`, `EVENTS_AT`, `TICKETMASTER`, `EVENTBRITE`, `EVENTFROG`).
- `limit` (number, default: 500) — Max records to return.
- `offset` (number, default: 0) — Pagination offset.

### `GET /api/v1/events/:id`
Returns full metadata for a single event record.

### `POST /ingestion/run`
Manually triggers an immediate ingestion and enrichment cycle across all active data providers.

---

## Testing

The project maintains comprehensive test suites with **155 automated tests** across both backend and frontend:

```bash
# Run backend test suite (NestJS / Jest) — 138 tests
npm run test

# Run frontend test suite (Next.js / Vitest) — 17 tests
cd frontend && npm run test

# Run full project test suite (155 tests)
npm run test && cd frontend && npm run test && cd ..
```

---

## License & Imprint

Media Owner & Operator: **Dipl.-Ing. Valentin Schnabl**, Vienna, Austria.  
Website: [valentin-schnabl.at](https://valentin-schnabl.at)  
Gewerberegister / GISA: `40023236`

This project is licensed under the **PolyForm Noncommercial License 1.0.0**. You are free to use, modify, study, and share this software for noncommercial, educational, and community purposes.