# Wien Heute — Vienna Event Mapping Application

A Progressive Web App (PWA) designed to aggregate, visualize, and discover current events in Vienna, Austria, via an interactive geographical map.

---

## 🚀 Quick Start with Docker Compose

Run the complete multi-container stack (PostgreSQL + PostGIS, NestJS API, Next.js Frontend) with a single command:

```bash
docker compose up --build
```

- **Frontend Application**: `http://localhost:3001`
- **Backend API**: `http://localhost:3000`
- **PostgreSQL / PostGIS Database**: `localhost:5432`

---

## 🛠️ Step-by-Step Manual Setup

### 1. Repository Setup & Dependencies

First, navigate to the main project folder:

```bash
cd "vienna-event-api"
```

Install backend dependencies:

```bash
npm install
```

Install frontend dependencies:

```bash
cd frontend
npm install
cd ..
```

---

### 2. Database Setup & Prisma Client

Ensure your `.env` file in `vienna-event-api/.env` contains your PostgreSQL / Supabase connection string (`DATABASE_URL`).

Generate the Prisma client and sync the schema:

```bash
npx prisma generate
npx prisma db push
```

---

### 3. Running the Backend API (NestJS)

The NestJS backend runs on **port 3000** by default (`http://localhost:3000`).

#### Development Mode (with auto-reload):
```bash
# Run from vienna-event-api root folder
npm run start:dev
```

#### Production Mode:
```bash
# Build NestJS backend
npm run build

# Start production server
node dist/src/main.js
```

> **API Endpoints:**
> - **Events API**: `GET http://localhost:3000/api/v1/events`
> - **Single Event**: `GET http://localhost:3000/api/v1/events/:id`
> - **Trigger Ingestion**: `POST http://localhost:3000/api/v1/ingest/trigger`

---

### 4. Running the Frontend PWA (Next.js)

The Next.js frontend runs on **port 3001** (`http://localhost:3001`).

#### Development Mode:
```bash
cd frontend
npm run dev
```

#### Production Mode:
```bash
cd frontend
npm run build
npm run start -- -p 3001
```

---

### 5. Running Unit & Integration Tests

The project includes **27 passing unit and integration tests** across the backend and frontend.

#### Run Backend Unit Tests (NestJS / Jest):
```bash
# Run from vienna-event-api root folder
npm run test
```
*Executes 21 unit tests covering controllers, services, database persistence, and ingestion pipelines.*

#### Run Frontend Unit Tests (Next.js / Vitest):
```bash
# Run from frontend folder
cd frontend
npm run test
```
*Executes 6 unit tests covering Haversine distance calculations and bilingual i18n dictionaries.*

#### Run All Tests in One Command:
```bash
# Run from vienna-event-api root folder
npm run test; cd frontend; npm run test; cd ..
```

---

## 🏗️ Tech Stack

- **Frontend**: Next.js 16 (React 19), Vanilla CSS Clean White Mode Theme, Leaflet, `react-leaflet-cluster` (FR-203 Marker Clustering), Vitest.
- **Backend**: NestJS 11 (REST API), TypeScript, Jest.
- **Database**: PostgreSQL + PostGIS, Prisma ORM 6, Supabase.
- **Localization**: Bilingual German (`de`) & English (`en`) runtime language switcher.
- **Privacy**: Client-side geolocation processing only (NFR-401).

---

## 📜 Available NPM Scripts

### Backend (`vienna-event-api`)
| Script | Command | Description |
|---|---|---|
| `npm run start:dev` | `nest start --watch` | Starts NestJS API in development mode |
| `npm run build` | `nest build` | Compiles NestJS TypeScript code to `dist/` |
| `npm run start:prod` | `node dist/main` | Runs compiled NestJS backend |
| `npm run test` | `jest` | Runs 21 backend unit test suites |

### Frontend (`vienna-event-api/frontend`)
| Script | Command | Description |
|---|---|---|
| `npm run dev` | `next dev` | Starts Next.js frontend server |
| `npm run build` | `next build` | Builds optimized production Next.js PWA |
| `npm run start` | `next start` | Runs compiled Next.js frontend production build |
| `npm run test` | `vitest run` | Runs 6 frontend unit test suites |