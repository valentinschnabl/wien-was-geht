"use client";

import { useEffect, useRef } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import type { LatLngExpression } from "leaflet";
import { translations, Language } from "@/lib/i18n";

export interface EventRecord {
  id: string;
  title: string;
  venueName?: string | null;
  description?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  startTime?: string | null;
  endTime?: string | null;
  url?: string | null;
  imageUrl?: string | null;
  category?: string | null;
  distanceKm?: number | null;
  temporalStatus?: "live" | "upcoming" | "concluded";
}

export interface UserLocation {
  lat: number;
  lng: number;
}

interface MapViewProps {
  events: EventRecord[];
  userLocation: UserLocation | null;
  language: Language;
  onLocateClick: () => void;
  locationState: "idle" | "locating" | "active" | "denied";
  onSelectEvent?: (event: EventRecord) => void;
  hoveredEventId?: string | null;
  onHoverEvent?: (id: string | null) => void;
  onPopupStateChange?: (isOpen: boolean) => void;
}

const DEFAULT_VIENNA: LatLngExpression = [48.2082, 16.3738];

// Clean User Location Marker
const userLocationIcon = L.divIcon({
  className: "custom-user-location-marker",
  html: `<div class="user-location-dot"><div class="user-inner-dot"></div></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

// Standard Event Marker Icon
const eventIcon = L.divIcon({
  className: "custom-event-marker",
  html: `<div class="event-pin"><span class="pin-inner"></span></div>`,
  iconSize: [24, 30],
  iconAnchor: [12, 30],
  popupAnchor: [0, -28],
});

// Highlighted Hover Event Marker Icon
const highlightedEventIcon = L.divIcon({
  className: "custom-event-marker highlighted",
  html: `<div class="event-pin event-pin-highlighted"><span class="pin-inner"></span></div>`,
  iconSize: [32, 40],
  iconAnchor: [16, 40],
  popupAnchor: [0, -38],
});

// Controls map position ONCE on initial location acquire without overriding manual user panning
function MapController({ center }: { center: LatLngExpression }) {
  const map = useMap();
  const initialCenteredRef = useRef(false);

  useEffect(() => {
    if (!initialCenteredRef.current) {
      initialCenteredRef.current = true;
      map.flyTo(center, 12, { duration: 1 });
    }
  }, [map, center]);
  return null;
}

// Standard Floating Leaflet Locate Control Button
function LocateControl({
  onLocate,
  isActive,
}: {
  onLocate: () => void;
  isActive: boolean;
}) {
  return (
    <div className="leaflet-top leaflet-left" style={{ marginTop: "80px" }}>
      <div className="leaflet-control leaflet-bar">
        <button
          type="button"
          className={`leaflet-control-locate-btn ${isActive ? "active" : ""}`}
          onClick={onLocate}
          title="Mein Standort / My Location"
          aria-label="Mein Standort / My Location"
        >
          🎯
        </button>
      </div>
    </div>
  );
}

export default function MapView({
  events,
  userLocation,
  language,
  onLocateClick,
  locationState,
  onSelectEvent,
  hoveredEventId,
  onHoverEvent,
  onPopupStateChange,
}: MapViewProps) {
  const t = translations[language];

  return (
    <div className="map-view-wrapper">
      <MapContainer
        center={DEFAULT_VIENNA}
        zoom={11.5}
        scrollWheelZoom
        className="map-shell"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Standard Map Overlay Locate Button */}
        <LocateControl
          onLocate={onLocateClick}
          isActive={locationState === "active"}
        />

        {userLocation && (
          <MapController center={[userLocation.lat, userLocation.lng]} />
        )}

        {/* User Location Marker */}
        {userLocation && (
          <Marker position={[userLocation.lat, userLocation.lng]} icon={userLocationIcon}>
            <Popup className="custom-compact-popup" autoPan={true} autoPanPadding={[50, 50]}>
              <div className="popup-user-location">
                <strong>📍 {t.myLocation}</strong>
                <p className="small-muted">{t.locationPrivacyNotice}</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Event Markers */}
        {events.map((event) => {
          if (
            typeof event.latitude !== "number" ||
            typeof event.longitude !== "number" ||
            (event.latitude === 0 && event.longitude === 0)
          ) {
            return null;
          }

          const isHovered = event.id === hoveredEventId;

          // Truncate description snippet for mini map popup
          const descSnippet = event.description
            ? event.description.length > 70
              ? event.description.slice(0, 70).trim() + "…"
              : event.description
            : null;

          return (
            <Marker
              key={event.id}
              position={[event.latitude, event.longitude]}
              icon={isHovered ? highlightedEventIcon : eventIcon}
              zIndexOffset={isHovered ? 1000 : 0}
              eventHandlers={{
                mouseover: () => onHoverEvent?.(event.id),
                mouseout: () => onHoverEvent?.(null),
              }}
            >
              {/* Compact Mini Map Popup with autoPan padding */}
              <Popup
                className="custom-compact-popup"
                autoPan={true}
                autoPanPadding={[50, 50]}
                eventHandlers={{
                  add: () => onPopupStateChange?.(true),
                  remove: () => onPopupStateChange?.(false),
                }}
              >
                <div className="compact-popup-content">
                  <div className="compact-popup-header">
                    {event.temporalStatus === "live" && (
                      <span className="badge badge-live">{t.statusLive}</span>
                    )}
                    {event.temporalStatus === "upcoming" && (
                      <span className="badge badge-upcoming">HEUTE</span>
                    )}
                    {event.temporalStatus === "concluded" && (
                      <span className="badge badge-concluded">BEENDET</span>
                    )}
                    {typeof event.distanceKm === "number" && (
                      <span className="compact-distance">
                        {event.distanceKm.toFixed(1)} km
                      </span>
                    )}
                  </div>

                  <h4 className="compact-popup-title">{event.title}</h4>
                  <p className="compact-popup-venue">📍 {event.venueName || t.venueDefault}</p>

                  {/* Truncated description preview */}
                  {descSnippet && (
                    <p className="compact-popup-snippet">{descSnippet}</p>
                  )}

                  <button
                    type="button"
                    className="btn-popup-details"
                    onClick={() => onSelectEvent?.(event)}
                  >
                    {t.showDetails} →
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
