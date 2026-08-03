import EventMap from "@/components/EventMap";

export default function Home() {
  return (
    <main className="page-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">MVP frontend</p>
          <h1>Vienna event discovery</h1>
          <p className="hero-text">
            Browse ingested events from the Nest API on a Leaflet map and in a simple list view.
          </p>
        </div>
      </header>

      <EventMap />
    </main>
  );
}
