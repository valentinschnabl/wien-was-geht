"use client";

import { useEffect, useRef, useMemo, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L, { type LatLngExpression } from "leaflet";
import { translations, Language, getCategoryLabel } from "@/lib/i18n";
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
  selectionSource?: "map" | "list";
  hoveredEventId?: string | null;
  onHoverEvent?: (id: string | null) => void;
  onPopupStateChange?: (isOpen: boolean) => void;
}

const DEFAULT_VIENNA: LatLngExpression = [48.2082, 16.3738];

function formatEventDateRange(
  startStr: string | null | undefined,
  endStr: string | null | undefined,
  lang: Language
): string {
  if (!startStr) return "";

  const start = new Date(startStr);
  const end = endStr ? new Date(endStr) : null;

  const locale = lang === "de" ? "de-AT" : "en-US";

  // Check if start and end are on the same calendar day
  const isSameDay =
    end === null ||
    (start.getFullYear() === end.getFullYear() &&
      start.getMonth() === end.getMonth() &&
      start.getDate() === end.getDate());

  const formatDate = (date: Date) => {
    return date.toLocaleDateString(locale, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString(locale, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  if (isSameDay) {
    const dateFormatted = formatDate(start);
    if (end) {
      // Check if they have a real time (meaning not 00:00 to 23:59)
      const isFullDay =
        start.getHours() === 0 &&
        start.getMinutes() === 0 &&
        end.getHours() === 23 &&
        end.getMinutes() === 59;

      if (isFullDay) {
        return dateFormatted;
      }

      return `${dateFormatted}, ${formatTime(start)} – ${formatTime(end)}`;
    }
    return `${dateFormatted}, ${formatTime(start)}`;
  } else {
    // Multi-day event
    const startFormatted = start.toLocaleDateString(locale, {
      day: "numeric",
      month: "short",
    });
    const endFormatted = end ? formatDate(end) : "";
    
    // Check if years are the same
    const sameYear = end && start.getFullYear() === end.getFullYear();
    const finalStartFormatted = sameYear
      ? startFormatted
      : start.toLocaleDateString(locale, {
          day: "numeric",
          month: "short",
          year: "numeric",
        });

    return end ? `${finalStartFormatted} – ${endFormatted}` : finalStartFormatted;
  }
}

// Controls map position ONCE on initial location acquire without overriding manual user panning
function MapController({ center }: { center: LatLngExpression }) {
  const map = useMap();
  const initialCenteredRef = useRef(false);

  useEffect(() => {
    if (!initialCenteredRef.current) {
      try {
        const size = map.getSize();
        if (size && size.x > 0 && size.y > 0) {
          initialCenteredRef.current = true;
          map.flyTo(center, 12, { duration: 1 });
        }
      } catch {
        // Guard against zero-dimension Leaflet calculation
      }
    }
  }, [map, center]);
  return null;
}

// Automatically resizes and re-renders Leaflet viewport when switching mobile tabs or adjusting container
function MapResizeController() {
  const map = useMap();

  useEffect(() => {
    const handleResize = () => {
      try {
        map.invalidateSize();
      } catch {
        // Guard against invisible container
      }
    };

    handleResize();
    const timer = setTimeout(handleResize, 150);

    window.addEventListener("resize", handleResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", handleResize);
    };
  }, [map]);

  return null;
}

// Pans and zooms smoothly when an event is selected from the sidebar list
function EventFlyToController({
  selectedEvent,
  selectionSource,
}: {
  selectedEvent?: EventRecord | null;
  selectionSource?: "map" | "list";
}) {
  const map = useMap();
  const prevSelectedRef = useRef<EventRecord | null>(null);

  const selectedId = selectedEvent?.id ?? null;
  const lat = selectedEvent?.latitude;
  const lng = selectedEvent?.longitude;

  useEffect(() => {
    // Only trigger flyTo when explicitly selected from sidebar list
    if (
      selectionSource === "list" &&
      typeof lat === "number" &&
      typeof lng === "number" &&
      lat !== 0 &&
      lng !== 0
    ) {
      try {
        const size = map.getSize();
        if (!size || size.x === 0 || size.y === 0) {
          return;
        }
        const currentZoom = map.getZoom();
        const targetZoom = Math.min(Math.max(currentZoom, 14.5), 15);
        map.flyTo([lat, lng], targetZoom, {
          duration: 0.6,
        });
        prevSelectedRef.current = selectedEvent ?? null;
      } catch (err) {
        console.warn("Leaflet flyTo suppressed on non-visible container", err);
      }
    }
  }, [map, selectedId, lat, lng, selectionSource]);

  return null;
}

// Clean User Location Marker
const userLocationIcon = L.divIcon({
  className: "custom-user-location-marker",
  html: `<div class="user-location-dot"><div class="user-inner-dot"></div></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

// Memoized static Event Marker Icon generator to prevent React reconciliation from breaking open spiderfied clusters
const getEventIcon = (eventId: string) =>
  L.divIcon({
    className: "custom-event-marker",
    html: `<div class="event-pin" data-pin-id="${eventId}"><span class="pin-inner"></span></div>`,
    iconSize: [24, 30],
    iconAnchor: [12, 30],
    popupAnchor: [0, -28],
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
  selectionSource,
  hoveredEventId,
  onHoverEvent,
  onPopupStateChange,
}: MapViewProps) {
  const t = translations[language];

  const selectedEventId = selectedEvent?.id ?? null;
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    const updateMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    updateMobile();
    window.addEventListener("resize", updateMobile);
    return () => window.removeEventListener("resize", updateMobile);
  }, []);

  // Efficient DOM class toggle on pins and cluster badges without re-rendering Marker components
  useEffect(() => {
    const activeId = hoveredEventId || selectedEventId;

    // 1. Highlight cluster badges containing the active event
    const badges = document.querySelectorAll(".custom-cluster-badge");
    badges.forEach((badge) => {
      const ids = badge.getAttribute("data-event-ids")?.split(",") ?? [];
      if (activeId && ids.includes(activeId)) {
        badge.classList.add("cluster-highlighted");
      } else {
        badge.classList.remove("cluster-highlighted");
      }
    });

    // 2. Highlight standalone or spiderfied pins without resetting Leaflet marker instances
    const pins = document.querySelectorAll(".event-pin");
    pins.forEach((pin) => {
      const pinId = pin.getAttribute("data-pin-id");
      if (activeId && pinId === activeId) {
        pin.classList.add("event-pin-highlighted");
      } else {
        pin.classList.remove("event-pin-highlighted");
      }
    });
  }, [hoveredEventId, selectedEventId]);

  // Calculate micro-offsets for co-located events and memoize marker elements
  const markerElements = useMemo(() => {
    // 1. Group events by coordinate key to detect co-located events
    const locationCounts = new Map<string, number>();
    events.forEach((ev) => {
      if (typeof ev.latitude === "number" && typeof ev.longitude === "number") {
        const key = `${ev.latitude.toFixed(5)},${ev.longitude.toFixed(5)}`;
        locationCounts.set(key, (locationCounts.get(key) || 0) + 1);
      }
    });

    const locationIndices = new Map<string, number>();

    return events.map((event) => {
      if (
        typeof event.latitude !== "number" ||
        typeof event.longitude !== "number" ||
        (event.latitude === 0 && event.longitude === 0)
      ) {
        return null;
      }

      const key = `${event.latitude.toFixed(5)},${event.longitude.toFixed(5)}`;
      const totalAtLoc = locationCounts.get(key) || 1;
      const indexAtLoc = locationIndices.get(key) || 0;
      locationIndices.set(key, indexAtLoc + 1);

      let finalLat = event.latitude;
      let finalLng = event.longitude;

      // Micro-spread co-located events in a clean ~15m radius around the venue location
      if (totalAtLoc > 1) {
        const angle = (indexAtLoc / totalAtLoc) * 2 * Math.PI;
        const radius = 0.00018; // ~15 meters in Vienna coordinates
        finalLat = event.latitude + Math.sin(angle) * radius;
        finalLng = event.longitude + Math.cos(angle) * (radius * 1.45);
      }

      // Truncate description snippet for mini map popup
      const descSnippet = event.description
        ? event.description.length > 70
          ? event.description.slice(0, 70).trim() + "…"
          : event.description
        : null;

      return (
        <Marker
          key={event.id}
          position={[finalLat, finalLng]}
          icon={getEventIcon(event.id)}
          // @ts-expect-error custom property for cluster hover detection
          eventId={event.id}
          eventHandlers={{
            add: (e) => {
              e.target.options.eventId = event.id;
            },
            mouseover: (e) => {
              e.target.getElement()?.querySelector(".event-pin")?.classList.add("event-pin-highlighted");
              onHoverEvent?.(event.id);
            },
            mouseout: (e) => {
              const pin = e.target.getElement()?.querySelector(".event-pin");
              pin?.classList.remove("event-pin-highlighted");
              onHoverEvent?.(null);
            },
            click: (e) => {
              e.originalEvent?.stopPropagation();
              onHoverEvent?.(event.id);
              if (isMobile) {
                onSelectEvent?.(event);
              }
            },
          }}
        >
          {/* On mobile: no popup balloon popping out of the marker pin. On desktop: render compact preview popup */}
          {!isMobile && (
            <Popup
              className="custom-compact-popup"
              autoPan={true}
              autoPanPaddingTopLeft={[40, 80]}
              autoPanPaddingBottomRight={[40, 40]}
              keepInView={true}
              eventHandlers={{
                add: () => onPopupStateChange?.(true),
                remove: () => onPopupStateChange?.(false),
              }}
            >
              <div className="compact-popup-content">
                <div className="compact-popup-header">
                  <div className="compact-popup-tags">
                    {event.temporalStatus === "live" && (
                      <span className="badge badge-live">
                        <i className="fa-solid fa-circle badge-dot"></i> {t.statusLive}
                      </span>
                    )}
                    {event.temporalStatus === "upcoming" && (
                      <span className="badge badge-upcoming">
                        <i className="fa-solid fa-clock"></i> HEUTE
                      </span>
                    )}
                    {event.temporalStatus === "concluded" && (
                      <span className="badge badge-concluded">
                        <i className="fa-solid fa-circle badge-dot"></i>{" "}
                        {language === "de" ? "BEENDET" : "ENDED"}
                      </span>
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

                <div className="compact-popup-time-box">
                  <i className="fa-solid fa-calendar-days time-icon"></i>
                  <span className="time-value">{formatEventDateRange(event.startTime, event.endTime, language)}</span>
                </div>

                <div className="compact-popup-category-box">
                  <i className="fa-solid fa-tag category-icon"></i>
                  <span className="category-value">{getCategoryLabel(event.category, language)}</span>
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
          )}
        </Marker>
      );
    });
  }, [events, language, isMobile]);

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
        <EventFlyToController
          selectedEvent={selectedEvent}
          selectionSource={selectionSource}
        />

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

        {/* Dynamic Marker Clustering: clusters at overview zoom, cleanly unclusters into separate pins at street level with no spider lines */}
        <MarkerClusterGroup
          key={`cluster-group-${events.map((e) => e.id).join('-').slice(0, 200)}`}
          chunkedLoading
          maxClusterRadius={35}
          spiderfyOnMaxZoom={false}
          showCoverageOnHover={false}
          zoomToBoundsOnClick={true}
          disableClusteringAtZoom={15}
          iconCreateFunction={createClusterIcon}
        >
          {markerElements}
        </MarkerClusterGroup>
      </MapContainer>
    </div>
  );
}
