# Vienna Event Mapping Application

A Progressive Web App (PWA) designed to aggregate, visualize, and discover current events in Vienna, Austria, via an interactive geographical map. Built with a strict $0/month deployment constraint, this project prioritizes proximity-aware discovery and high-performance geospatial queries while explicitly excluding routing features.

## Key Features

* **Interactive Event Map:** Real-time marker plotting on a Vienna-centered map using Leaflet and OpenStreetMap tiles.
* **Proximity Discovery:** Client-side geolocation processing to show events relative to the user's current physical location (privacy-preserving).
* **Advanced Filtering:** Filter events by categories, time horizons, and a dynamic "in progress / already concluded" temporal toggle.
* **High-Performance Geospatial Queries:** Sub-200ms bounding-box resolution as the map pans, utilizing PostGIS GiST indexing.
* **Automated Data Ingestion:** Daily scheduled normalization and deduplication of third-party event data (e.g., Stadt Wien Open Data).
* **Bilingual Interface:** Seamless runtime toggling between German and English.

## System Architecture & Tech Stack

The architecture separates the client-facing REST API from the frontend to allow future integration with native mobile clients.

### Frontend (PWA)

* **Framework:** Next.js (React) with Server-Side Rendering (SSR) for optimal FCP and SEO.
* **Mapping:** `react-leaflet` + OpenStreetMap (Zero-cost, no API keys required).
* **Deployment:** Vercel (Hobby Tier).

### Backend (REST API)

* **Framework:** Standalone NestJS application.
* **Language:** TypeScript, sharing types and validation schemas (Zod/class-validator) across the stack.
* **Documentation:** Auto-generated Swagger/OpenAPI specifications.
* **Deployment:** Render or Railway (Free Tier).

### Database

* **Engine:** PostgreSQL with the PostGIS extension for spatial geometries.
* **ORM:** Prisma Client.
* **Hosting:** Supabase (Free Tier) — chosen to maintain continuous compute and avoid NFR-breaking cold starts on database queries.

### Data Ingestion Pipeline

* **Scheduler:** Vercel Cron (Daily Cadence).
* **Process:** Triggers an internal Next.js route handler (`/api/cron/ingest`) that fetches, parses, deduplicates (FR-403), and writes standardized event data directly to Supabase.

## Local Development Setup

### Prerequisites

* Node.js (v18+)
* Docker (optional, for local PostGIS database) or a remote Supabase instance
* Yarn or npm

### 1. Database Setup

Ensure you have a PostgreSQL database running with the PostGIS extension enabled.

```bash
# Push the schema and generate the Prisma client
npx prisma db push
npx prisma generate

```

### 2. Backend (NestJS API)

```bash
cd backend
npm install
# Set your DATABASE_URL in .env
npm run start:dev

```

*The API will be available at `http://localhost:3000`. Swagger UI is accessible at `/api/docs`.*

### 3. Frontend (Next.js)

```bash
cd frontend
npm install
# Set your API base URL in .env.local
npm run dev

```

*The web application will be available at `http://localhost:3001`.*

## Privacy & Security

* Geolocation data is processed strictly on the client side for map centering only and is never persisted to the backend (NFR-401).
* Explicit user consent is requested prior to utilizing the browser Geolocation API.
* Analytics are implemented via privacy-preserving, cookieless tracking mechanisms.