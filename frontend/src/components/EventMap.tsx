"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

interface EventRecord {
  id: string;
  title: string;
  venueName?: string | null;
  description?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  startTime?: string | null;
}

const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => <div className="map-loading">Loading map…</div>,
});

export default function EventMap() {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

    const loadEvents = async () => {
      try {
        const response = await fetch(`${apiBase}/api/v1/events?limit=100`);
        if (!response.ok) {
          throw new Error(`Request failed with ${response.status}`);
        }

        const payload = await response.json();
        setEvents(payload.data ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    void loadEvents();
  }, []);

  return (
    <div className="dashboard-grid">
      <section className="panel panel-map">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Map</p>
            <h2>Current events in Vienna</h2>
          </div>
        </div>

        {loading ? <div className="map-loading">Loading events…</div> : null}
        {error ? <p className="error">{error}</p> : null}

        {!loading && !error ? <MapView events={events} /> : null}
      </section>

      <aside className="panel panel-list">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Events</p>
            <h2>Latest results</h2>
          </div>
        </div>

        <div className="event-list">
          {events.map((event) => (
            <article key={event.id} className="event-card">
              <h3>{event.title}</h3>
              <p className="muted">{event.venueName ?? "Vienna"}</p>
              <p>{event.description ?? "No description available."}</p>
              <p className="timestamp">
                {event.startTime ? new Date(event.startTime).toLocaleString() : "Time unknown"}
              </p>
            </article>
          ))}
        </div>
      </aside>
    </div>
  );
}
