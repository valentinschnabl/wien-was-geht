"use client";

import { useEffect, useRef, useMemo } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import type { LatLngExpression } from "leaflet";
import { translations, Language } from "@/lib/i18n";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";

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
  selectedEvent?: EventRecord | null;
  hoveredEventId?: string | null;
  onHoverEvent?: (id: string | null) => void;
  onPopupStateChange?: (isOpen: boolean) => void;
}

const DEFAULT_VIENNA: LatLngExpression = [48.2082, 16.3738];

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

// Pans and zooms in smoothly when an event is selected from the sidebar
function EventFlyToController({ selectedEvent }: { selectedEvent?: EventRecord | null }) {
  const map = useMap();

  useEffect(() => {
    if (
      selectedEvent &&
      typeof selectedEvent.latitude === "number" &&
      typeof selectedEvent.longitude === "number" &&
      selectedEvent.latitude !== 0 &&
      selectedEvent.longitude !== 0
    ) {
      // Zoom to street-level (16.5) so clustered markers automatically uncluster
      map.flyTo([selectedEvent.latitude, selectedEvent.longitude], 16.5, {
        duration: 0.8,
      });
    }
  }, [map, selectedEvent]);

  return null;
}

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
          <i className="fa-solid fa-location-crosshairs"></i>
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
  selectedEvent,
  hoveredEventId,
  onHoverEvent,
  onPopupStateChange,
}: MapViewProps) {
  const t = translations[language];

  // Dynamically create cluster icons - turns RED if any child marker inside is hovered!
  const createClusterIcon = useMemo(() => {
    return (cluster: L.MarkerCluster) => {
      const childMarkers = cluster.getAllChildMarkers();
      const containsHovered = hoveredEventId
        ? childMarkers.some(
            (m: L.Marker & { options?: { eventId?: string } }) =>
              m.options?.eventId === hoveredEventId
          )
        : false;

      const count = cluster.getChildCount();

      return L.divIcon({
        html: `<div class="custom-cluster-badge ${
          containsHovered ? "cluster-highlighted" : ""
        }"><span>${count}</span></div>`,
        className: "custom-cluster-icon-wrapper",
        iconSize: L.point(38, 38),
        iconAnchor: L.point(19, 19),
      });
    };
  }, [hoveredEventId]);

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

        {/* Controller to fly and zoom to selected event */}
        <EventFlyToController selectedEvent={selectedEvent} />

        {userLocation && (
          <MapController center={[userLocation.lat, userLocation.lng]} />
        )}

        {/* User Location Marker */}
        {userLocation && (
          <Marker position={[userLocation.lat, userLocation.lng]} icon={userLocationIcon}>
            <Popup className="custom-compact-popup" autoPan={true} autoPanPadding={[50, 50]}>
              <div className="popup-user-location">
                <strong><i className="fa-solid fa-location-dot"></i> {t.myLocation}</strong>
                <p className="small-muted">{t.locationPrivacyNotice}</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* FR-203 Marker Clustering with dynamic red highlight on hover */}
        <MarkerClusterGroup
          key={hoveredEventId ?? "cluster-group"}
          chunkedLoading
          maxClusterRadius={35}
          spiderfyOnMaxZoom={true}
          showCoverageOnHover={false}
          disableClusteringAtZoom={15}
          iconCreateFunction={createClusterIcon}
        >
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
                // @ts-expect-error custom property for cluster hover detection
                eventId={event.id}
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
                    <p className="compact-popup-venue">
                      <i className="fa-solid fa-location-dot"></i> {event.venueName || t.venueDefault}
                    </p>

                    {/* Truncated description preview */}
                    {descSnippet && (
                      <p className="compact-popup-snippet">{descSnippet}</p>
                    )}

                    <button
                      type="button"
                      className="btn-popup-details"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Close popup cleanly before opening sidebar details to prevent UI flash
                        const closeBtn = (e.target as HTMLElement)
                          .closest(".leaflet-popup")
                          ?.querySelector(".leaflet-popup-close-button") as HTMLElement | null;
                        if (closeBtn) {
                          closeBtn.click();
                        }
                        onSelectEvent?.(event);
                      }}
                    >
                      {t.showDetails} →
                    </button>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MarkerClusterGroup>
      </MapContainer>
    </div>
  );
}
