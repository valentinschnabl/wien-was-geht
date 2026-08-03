"use client";

import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import type { LatLngExpression } from "leaflet";

interface EventRecord {
  id: string;
  title: string;
  venueName?: string | null;
  description?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  startTime?: string | null;
  endTime?: string | null;
  url?: string | null;
}

interface MapViewProps {
  events: EventRecord[];
}

export default function MapView({ events }: MapViewProps) {
  const center: LatLngExpression = [48.2082, 16.3738];

  return (
    <MapContainer center={center} zoom={13} scrollWheelZoom className="map-shell">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {events.map((event) => {
        if (typeof event.latitude !== "number" || typeof event.longitude !== "number") {
          return null;
        }

        return (
          <Marker key={event.id} position={[event.latitude, event.longitude]}>
            <Popup>
              <strong>{event.title}</strong>
              <br />
              {event.venueName}
              <br />
              {event.url}
              <br />
              {event.startTime ? new Date(event.startTime).toLocaleString() : "Time unknown"} - {event.endTime ? new Date(event.endTime).toLocaleString() : "Time unknown"}
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
