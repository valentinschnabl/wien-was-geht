"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, useMemo, useRef } from "react";
import { translations, Language } from "@/lib/i18n";
import LanguageSwitcher from "./LanguageSwitcher";
import type { EventRecord, UserLocation } from "./MapView";

const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => <div className="map-loading">Lade Karte...</div>,
});

function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function EventMap() {
  const [language, setLanguage] = useState<Language>("de");
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [includeConcluded, setIncludeConcluded] = useState(false);

  // Hover, Selection & Popup state
  const [hoveredEventId, setHoveredEventId] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<EventRecord | null>(null);
  const [isMapPopupOpen, setIsMapPopupOpen] = useState(false);

  // Ref map for sidebar card elements
  const cardRefs = useRef<Record<string, HTMLElement | null>>({});

  // Geolocation state
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locationState, setLocationState] = useState<
    "idle" | "locating" | "active" | "denied"
  >("idle");

  const t = translations[language];

  // Request location directly using browser standard API on page load
  useEffect(() => {
    requestBrowserLocation();
  }, []);

  // Smooth scroll sidebar to hovered event card ONLY when map popup is NOT open
  useEffect(() => {
    if (!isMapPopupOpen && hoveredEventId && cardRefs.current[hoveredEventId]) {
      cardRefs.current[hoveredEventId]?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [hoveredEventId, isMapPopupOpen]);

  const handleHoverEvent = (id: string | null) => {
    setHoveredEventId(id);
  };

  const requestBrowserLocation = () => {
    if (!navigator.geolocation) {
      setLocationState("denied");
      return;
    }

    setLocationState("locating");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        setLocationState("active");
      },
      (_err) => {
        setLocationState("denied");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Fetch events from NestJS API
  useEffect(() => {
    const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

    const loadEvents = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${apiBase}/api/v1/events?limit=200`);
        if (!response.ok) {
          throw new Error(`API returned status ${response.status}`);
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

  // Filter events: SCOPED TO TODAY (2026-08-06)
  const filteredEvents = useMemo(() => {
    const now = new Date("2026-08-06T15:44:00+02:00");
    const todayStart = new Date("2026-08-06T00:00:00+02:00");
    const todayEnd = new Date("2026-08-06T23:59:59+02:00");

    return events
      .map((ev) => {
        let dist: number | null = null;
        if (
          userLocation &&
          typeof ev.latitude === "number" &&
          typeof ev.longitude === "number" &&
          ev.latitude !== 0
        ) {
          dist = calculateDistanceKm(
            userLocation.lat,
            userLocation.lng,
            ev.latitude,
            ev.longitude
          );
        }

        const start = ev.startTime ? new Date(ev.startTime) : new Date();
        const end = ev.endTime ? new Date(ev.endTime) : start;

        // Classify temporal status
        let temporalStatus: "live" | "upcoming" | "concluded" = "upcoming";
        if (end < now) {
          temporalStatus = "concluded";
        } else if (start <= now && end >= now) {
          temporalStatus = "live";
        } else {
          temporalStatus = "upcoming";
        }

        return { ...ev, distanceKm: dist, temporalStatus, startDate: start, endDate: end };
      })
      .filter((ev) => {
        // Exclude events without location coordinates
        if (
          typeof ev.latitude !== "number" ||
          typeof ev.longitude !== "number" ||
          (ev.latitude === 0 && ev.longitude === 0) ||
          Number.isNaN(ev.latitude) ||
          Number.isNaN(ev.longitude)
        ) {
          return false;
        }

        // ONLY events happening TODAY (starts on/before today AND ends on/after today)
        const activeToday = ev.startDate <= todayEnd && ev.endDate >= todayStart;
        if (!activeToday) return false;

        // FR-303 Toggle: Exclude concluded events today if toggle is false
        if (!includeConcluded && ev.temporalStatus === "concluded") {
          return false;
        }

        // Search Query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const titleMatch = ev.title.toLowerCase().includes(q);
          const venueMatch = ev.venueName?.toLowerCase().includes(q) ?? false;
          if (!titleMatch && !venueMatch) return false;
        }

        return true;
      })
      .sort((a, b) => {
        // Live events first, then upcoming, then by distance or title
        if (a.temporalStatus === "live" && b.temporalStatus !== "live") return -1;
        if (a.temporalStatus !== "live" && b.temporalStatus === "live") return 1;

        if (a.distanceKm !== null && b.distanceKm !== null) {
          return a.distanceKm - b.distanceKm;
        }
        return a.title.localeCompare(b.title);
      });
  }, [events, userLocation, includeConcluded, searchQuery]);

  return (
    <div className="app-container-clean">
      {/* Clean Municipal Header */}
      <header className="app-header-clean">
        <div className="header-branding">
          <div className="city-badge">
            <span className="wien-icon">🇦🇹</span> Stadt Wien Event-Portal
          </div>
          <h1 className="header-title">{t.appTitle}</h1>
          <p className="header-subtitle">{t.appSubtitle}</p>
        </div>

        <div className="header-actions">
          <LanguageSwitcher
            currentLanguage={language}
            onLanguageChange={setLanguage}
          />
        </div>
      </header>

      {/* Dashboard Layout - Large Map on Left, Search / Detailed View on Right */}
      <div className="dashboard-grid">
        {/* Enlarged Map Panel */}
        <section className="clean-panel panel-map">
          <div className="panel-header">
            <div>
              <p className="panel-eyebrow">Interactive Map</p>
              <h2>{t.mapTitle}</h2>
            </div>

            {/* FR-303 Concluded Events Toggle */}
            <label className="checkbox-label header-toggle">
              <input
                type="checkbox"
                checked={includeConcluded}
                onChange={(e) => setIncludeConcluded(e.target.checked)}
                className="checkbox-input"
              />
              <span className="checkbox-custom"></span>
              <span className="label-text">{t.toggleConcluded}</span>
            </label>
          </div>

          {loading ? <div className="map-loading">{t.loadingEvents}</div> : null}
          {error ? <p className="error">{t.errorLoading}: {error}</p> : null}

          {!loading && !error && (
            <MapView
              events={filteredEvents}
              userLocation={userLocation}
              language={language}
              onLocateClick={requestBrowserLocation}
              locationState={locationState}
              onSelectEvent={(ev) => setSelectedEvent(ev)}
              hoveredEventId={hoveredEventId}
              onHoverEvent={handleHoverEvent}
              onPopupStateChange={(isOpen) => setIsMapPopupOpen(isOpen)}
            />
          )}
        </section>

        {/* Sidebar Panel: Renders Event List OR Selected Event Detail Page */}
        <aside className="clean-panel panel-list">
          {selectedEvent ? (
            /* DETAILED EVENT PAGE ON THE RIGHT SIDEBAR */
            <div className="sidebar-detail-view">
              <button
                type="button"
                className="btn-back-sidebar"
                onClick={() => setSelectedEvent(null)}
              >
                ← {language === "de" ? "Zurück zur Übersicht" : "Back to list"}
              </button>

              {/* Event Image */}
              {selectedEvent.imageUrl && (
                <div className="sidebar-detail-image-wrapper">
                  <img
                    src={selectedEvent.imageUrl}
                    alt={selectedEvent.title}
                    className="sidebar-detail-image"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                </div>
              )}

              <div className="sidebar-detail-content">
                <div className="compact-top-tags">
                  {selectedEvent.temporalStatus === "live" && (
                    <span className="badge badge-live">{t.statusLive}</span>
                  )}
                  {selectedEvent.temporalStatus === "upcoming" && (
                    <span className="badge badge-upcoming">
                      {t.statusUpcoming("")}
                    </span>
                  )}
                  {selectedEvent.temporalStatus === "concluded" && (
                    <span className="badge badge-concluded">
                      {t.statusConcluded}
                    </span>
                  )}

                  {typeof selectedEvent.distanceKm === "number" && (
                    <span className="distance-pill">
                      🚶 {t.distanceAway(selectedEvent.distanceKm)}
                    </span>
                  )}
                </div>

                <h2 className="sidebar-detail-title">{selectedEvent.title}</h2>

                <div className="sidebar-detail-meta">
                  <p>📍 <strong>{selectedEvent.venueName || t.venueDefault}</strong></p>
                  <p>
                    🕒{" "}
                    {selectedEvent.startTime
                      ? new Date(selectedEvent.startTime).toLocaleString(
                          language === "de" ? "de-AT" : "en-US",
                          {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )
                      : t.timeUnknown}
                  </p>
                </div>

                <div className="sidebar-detail-description">
                  <h4>Beschreibung</h4>
                  <p>
                    {selectedEvent.description ||
                      "Keine nähere Beschreibung verfügbar."}
                  </p>
                </div>

                {selectedEvent.url && (
                  <a
                    href={selectedEvent.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary btn-full-width"
                  >
                    {t.externalLink}
                  </a>
                )}
              </div>
            </div>
          ) : (
            /* STANDARD EVENTS SEARCH + LIST VIEW */
            <>
              <div className="panel-header">
                <div>
                  <p className="panel-eyebrow">{t.eventsTitle}</p>
                  <h2>
                    {filteredEvents.length} {t.eventsCount}
                  </h2>
                </div>
              </div>

              {/* Search bar strictly over events */}
              <div className="sidebar-search-container">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  placeholder={t.searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input sidebar-search-input"
                />
              </div>

              <div className="event-list">
                {filteredEvents.length === 0 && !loading && (
                  <div className="empty-state">
                    <p>{t.noEvents}</p>
                  </div>
                )}

                {filteredEvents.map((event) => {
                  const startTimeStr = event.startTime
                    ? new Date(event.startTime).toLocaleTimeString(
                        language === "de" ? "de-AT" : "en-US",
                        { hour: "2-digit", minute: "2-digit" }
                      )
                    : "";
                  const isHovered = event.id === hoveredEventId;

                  return (
                    <article
                      key={event.id}
                      ref={(el) => {
                        cardRefs.current[event.id] = el;
                      }}
                      className={`event-compact-card ${isHovered ? "hovered" : ""}`}
                      onMouseEnter={() => setHoveredEventId(event.id)}
                      onMouseLeave={() => setHoveredEventId(null)}
                      onClick={() => setSelectedEvent(event)}
                    >
                      <div className="compact-card-body">
                        {/* Database Picture Thumbnail */}
                        {event.imageUrl && (
                          <div className="compact-thumb-wrapper">
                            <img
                              src={event.imageUrl}
                              alt={event.title}
                              className="compact-thumb"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = "none";
                              }}
                            />
                          </div>
                        )}

                        <div className="compact-info">
                          <div className="compact-top-tags">
                            {event.temporalStatus === "live" && (
                              <span className="badge badge-live">{t.statusLive}</span>
                            )}
                            {event.temporalStatus === "upcoming" && (
                              <span className="badge badge-upcoming">
                                {t.statusUpcoming(startTimeStr)}
                              </span>
                            )}
                            {event.temporalStatus === "concluded" && (
                              <span className="badge badge-concluded">
                                {t.statusConcluded}
                              </span>
                            )}

                            {typeof event.distanceKm === "number" && (
                              <span className="distance-pill">
                                🚶 {event.distanceKm.toFixed(1)} km
                              </span>
                            )}
                          </div>

                          <h3 className="compact-title">{event.title}</h3>
                          <p className="compact-venue">📍 {event.venueName || t.venueDefault}</p>

                          <div className="compact-bottom-row">
                            <button
                              type="button"
                              className="btn-card-details"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedEvent(event);
                              }}
                            >
                              {t.showDetails} →
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
