"use client";

import { useEffect, useRef } from "react";
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

// Invalidates Leaflet map container bounds whenever visibility changes (e.g. mobile tab switch)
function MapResizeController() {
  const map = useMap();

  useEffect(() => {
    map.invalidateSize();
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 150);

    const handleResize = () => {
      map.invalidateSize();
    };

    window.addEventListener("resize", handleResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", handleResize);
    };
  }, [map]);

  return null;
}

// Pans and zooms smoothly when an event is selected from the sidebar or reset back to overview
function EventFlyToController({ selectedEvent }: { selectedEvent?: EventRecord | null }) {
  const map = useMap();
  const prevSelectedRef = useRef<EventRecord | null>(null);

  const selectedId = selectedEvent?.id ?? null;
  const lat = selectedEvent?.latitude;
  const lng = selectedEvent?.longitude;

  useEffect(() => {
    if (
      typeof lat === "number" &&
      typeof lng === "number" &&
      lat !== 0 &&
      lng !== 0
    ) {
      // Zoom to street-level (16.5) so clustered markers automatically uncluster
      map.flyTo([lat, lng], 16.5, {
        duration: 0.8,
      });
      prevSelectedRef.current = selectedEvent ?? null;
    } else if (!selectedId && prevSelectedRef.current) {
      // Smoothly zoom out and fly back to full Vienna overview (48.2082, 16.3738) at zoom 11.5
      map.flyTo([48.2082, 16.3738], 11.5, {
        duration: 0.8,
      });
      prevSelectedRef.current = null;
    }
  }, [map, selectedId, lat, lng]);

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

// Custom cluster icon creation with data-event-ids attribute for non-destructive hover highlighting
const createClusterIcon = (cluster: L.MarkerCluster) => {
  const childMarkers = cluster.getAllChildMarkers();
  const childIds = childMarkers
    .map(
      (m: L.Marker & { options?: { eventId?: string }; eventId?: string }) =>
        m.options?.eventId || m.eventId
    )
    .filter(Boolean)
    .join(",");

  const count = cluster.getChildCount();

  return L.divIcon({
    html: `<div class="custom-cluster-badge" data-event-ids="${childIds}"><span>${count}</span></div>`,
    className: "custom-cluster-icon-wrapper",
    iconSize: L.point(38, 38),
    iconAnchor: L.point(19, 19),
  });
};

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

  const selectedEventId = selectedEvent?.id ?? null;

  // Efficient DOM class toggle on cluster badges for both hovered and selected events
  useEffect(() => {
    const activeId = hoveredEventId || selectedEventId;
    const badges = document.querySelectorAll(".custom-cluster-badge");
    badges.forEach((badge) => {
      const ids = badge.getAttribute("data-event-ids")?.split(",") ?? [];
      if (activeId && ids.includes(activeId)) {
        badge.classList.add("cluster-highlighted");
      } else {
        badge.classList.remove("cluster-highlighted");
      }
    });
  }, [hoveredEventId, selectedEventId]);

  return (
    <div className="map-view-wrapper">
      <MapContainer
        center={DEFAULT_VIENNA}
        zoom={11.5}
        scrollWheelZoom
        className="map-shell"
      >
        <TileLayer
          attribution='&copy; Esri &bull; OpenStreetMap'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}"
        />

        {/* Resizes and invalidates map container size on mobile tab switch */}
        <MapResizeController />

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
                <span className="user-location-badge">
                  <i className="fa-solid fa-location-crosshairs"></i> {t.myLocation}
                </span>
                <p className="user-location-sub">{t.locationPrivacyNotice}</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* FR-203 Stable Marker Clustering Group */}
        <MarkerClusterGroup
          key="stable-vienna-cluster-group"
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

            const isHighlighted =
              event.id === hoveredEventId || event.id === selectedEvent?.id;

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
                icon={isHighlighted ? highlightedEventIcon : eventIcon}
                zIndexOffset={isHighlighted ? 1000 : 0}
                // @ts-expect-error custom property for cluster hover detection
                eventId={event.id}
                eventHandlers={{
                  add: (e) => {
                    e.target.options.eventId = event.id;
                  },
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
                      <div className="compact-popup-tags">
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
                            <i className="fa-solid fa-location-arrow"></i>{" "}
                            {event.distanceKm.toFixed(1)} km
                          </span>
                        )}
                      </div>
                    </div>

                    <h4 className="compact-popup-title">{event.title}</h4>

                    <div className="compact-popup-venue-box">
                      <i className="fa-solid fa-location-dot venue-icon"></i>
                      <span className="venue-name">{event.venueName || t.venueDefault}</span>
                    </div>

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
                      {t.showDetails} &rarr;
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
