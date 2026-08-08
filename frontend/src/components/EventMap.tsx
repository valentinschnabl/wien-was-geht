"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, useMemo, useRef } from "react";
import { translations, Language } from "@/lib/i18n";
import LanguageSwitcher from "./LanguageSwitcher";
import type { EventRecord, UserLocation } from "./MapView";
import { calculateDistanceKm } from "@/lib/distance";

const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => <div className="map-loading">Lade Karte...</div>,
});

export default function EventMap() {
  const [language, setLanguage] = useState<Language>("de");
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [includeConcluded, setIncludeConcluded] = useState(false);
  const [quickFilter, setQuickFilter] = useState<"all" | "live">("all");

  // Mobile Tab state (Map vs List View for Mobile UX)
  const [mobileTab, setMobileTab] = useState<"map" | "list">("map");

  // Hover, Selection & Popup state
  const [hoveredEventId, setHoveredEventId] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<EventRecord | null>(null);
  const [isMapPopupOpen, setIsMapPopupOpen] = useState(false);
  const [failedImageIds, setFailedImageIds] = useState<Record<string, boolean>>({});

  // Modal overlay state (Impressum / Datenschutz)
  const [activeModal, setActiveModal] = useState<"imprint" | "privacy" | null>(null);

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
    if (!isMapPopupOpen) {
      setHoveredEventId(id);
    }
  };

  const handleSelectEvent = (event: EventRecord) => {
    setSelectedEvent(event);
    setHoveredEventId(event.id); // Automatically mark the event with the RED highlighted pin
    setMobileTab("list"); // On mobile, automatically switch to detailed view panel
  };

  const handleBackToList = () => {
    setSelectedEvent(null);
    setHoveredEventId(null);
  };

  const handleImageError = (id: string) => {
    setFailedImageIds((prev) => ({ ...prev, [id]: true }));
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

  // Compute total live & upcoming counts for header stats
  const eventStats = useMemo(() => {
    const now = new Date("2026-08-06T15:44:00+02:00");
    let liveCount = 0;
    let upcomingCount = 0;

    events.forEach((ev) => {
      const start = ev.startTime ? new Date(ev.startTime) : new Date();
      const end = ev.endTime ? new Date(ev.endTime) : start;
      if (start <= now && end >= now) {
        liveCount++;
      } else if (start > now) {
        upcomingCount++;
      }
    });

    return { liveCount, upcomingCount };
  }, [events]);

  // Filter events: SCOPED TO TODAY (2026-08-06)
  const filteredEvents = useMemo(() => {
    const now = new Date("2026-08-06T15:44:00+02:00");
    const todayStart = new Date("2026-08-06T00:00:00+02:00");
    const todayEnd = new Date("2026-08-06T23:59:59+02:00");

    // Reference location: User coordinates or fallback to Vienna City Center (48.2082, 16.3738)
    const referenceLocation = userLocation ?? { lat: 48.2082, lng: 16.3738 };

    return events
      .map((ev) => {
        let dist: number | null = null;
        if (
          typeof ev.latitude === "number" &&
          typeof ev.longitude === "number" &&
          ev.latitude !== 0 &&
          ev.longitude !== 0
        ) {
          dist = calculateDistanceKm(
            referenceLocation.lat,
            referenceLocation.lng,
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

        // ONLY events happening TODAY
        const activeToday = ev.startDate <= todayEnd && ev.endDate >= todayStart;
        if (!activeToday) return false;

        // FR-303 Toggle: Exclude concluded events today if toggle is false
        if (!includeConcluded && ev.temporalStatus === "concluded") {
          return false;
        }

        // Quick Filter Chip Filtering
        if (quickFilter === "live" && ev.temporalStatus !== "live") {
          return false;
        }

        // Search Query Filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const titleMatch = ev.title.toLowerCase().includes(q);
          const venueMatch = ev.venueName?.toLowerCase().includes(q) ?? false;
          if (!titleMatch && !venueMatch) return false;
        }

        return true;
      })
      .sort((a, b) => {
        // Sort strictly by distance ascending across all filter views
        const distA = a.distanceKm ?? 9999;
        const distB = b.distanceKm ?? 9999;
        if (distA !== distB) {
          return distA - distB;
        }
        return a.title.localeCompare(b.title);
      });
  }, [events, userLocation, includeConcluded, searchQuery, quickFilter]);

  return (
    <div className="app-container-clean">
      {/* Rebranded Header */}
      <header className="app-header-clean">
        <div className="header-branding">
          <div className="city-badge-row">
            <span className="city-badge">
              <i className="fa-solid fa-city"></i> WasGehtWien
            </span>
            <span className="stats-pill">
              <i className="fa-solid fa-bolt"></i> {eventStats.liveCount} Live &bull;{" "}
              <i className="fa-solid fa-clock"></i> {eventStats.upcomingCount} Demnächst
            </span>
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

      {/* Dashboard Layout - Responsive Grid & Mobile View Switching */}
      <div className={`dashboard-grid mobile-view-${mobileTab}`}>
        {/* Enlarged Map Panel */}
        <section className="clean-panel panel-map">
          <div className="panel-header map-panel-header">
            <div className="map-header-left">
              <i className="fa-solid fa-map-location-dot"></i> <span>Wien Karte</span>
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
              onSelectEvent={handleSelectEvent}
              selectedEvent={selectedEvent}
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
                onClick={handleBackToList}
              >
                <i className="fa-solid fa-arrow-left"></i>{" "}
                {language === "de" ? "Zurück zur Übersicht" : "Back to list"}
              </button>

              {/* Event Image Banner or Clean Informative Placeholder */}
              <div className="sidebar-detail-image-wrapper">
                {selectedEvent.imageUrl && !failedImageIds[selectedEvent.id] ? (
                  <img
                    src={selectedEvent.imageUrl}
                    alt={selectedEvent.title}
                    className="sidebar-detail-image"
                    onError={() => handleImageError(selectedEvent.id)}
                  />
                ) : (
                  <div className="sidebar-detail-placeholder">
                    <i className="fa-solid fa-image placeholder-icon"></i>
                    <span>
                      {language === "de"
                        ? "Kein Bild für dieses Event verfügbar"
                        : "No image available for this event"}
                    </span>
                  </div>
                )}
              </div>

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
                      <i className="fa-solid fa-location-arrow"></i>{" "}
                      {t.distanceAway(selectedEvent.distanceKm)}
                    </span>
                  )}
                </div>

                <h2 className="sidebar-detail-title">{selectedEvent.title}</h2>

                <div className="sidebar-detail-meta">
                  <p>
                    <i className="fa-solid fa-location-dot"></i>{" "}
                    <strong>{selectedEvent.venueName || t.venueDefault}</strong>
                  </p>
                  <p>
                    <i className="fa-solid fa-clock"></i>{" "}
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
                    {t.externalLink}{" "}
                    <i className="fa-solid fa-arrow-up-right-from-square"></i>
                  </a>
                )}
              </div>
            </div>
          ) : (
            /* STANDARD EVENTS SEARCH + QUICK FILTERS + LIST VIEW */
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
                <i className="fa-solid fa-magnifying-glass search-icon"></i>
                <input
                  type="text"
                  placeholder={t.searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input sidebar-search-input"
                />
              </div>

              {/* Quick Filter Segmented Control Chips */}
              <div className="quick-filter-chips">
                <button
                  type="button"
                  className={`chip-btn ${quickFilter === "all" ? "active" : ""}`}
                  onClick={() => setQuickFilter("all")}
                >
                  Alle
                </button>
                <button
                  type="button"
                  className={`chip-btn ${quickFilter === "live" ? "active" : ""}`}
                  onClick={() => setQuickFilter("live")}
                >
                  <i className="fa-solid fa-bolt"></i> Live
                </button>
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
                      onMouseEnter={() => !isMapPopupOpen && setHoveredEventId(event.id)}
                      onMouseLeave={() => !isMapPopupOpen && setHoveredEventId(null)}
                      onClick={() => handleSelectEvent(event)}
                    >
                      <div className="compact-card-body">
                        {/* Database Picture Thumbnail or Clean Vector Placeholder */}
                        <div className="compact-thumb-wrapper">
                          {event.imageUrl && !failedImageIds[event.id] ? (
                            <img
                              src={event.imageUrl}
                              alt={event.title}
                              className="compact-thumb"
                              onError={() => handleImageError(event.id)}
                            />
                          ) : (
                            <div className="compact-thumb-placeholder">
                              <i className="fa-solid fa-image"></i>
                            </div>
                          )}
                        </div>

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
                                <i className="fa-solid fa-location-arrow"></i>{" "}
                                {event.distanceKm.toFixed(1)} km
                              </span>
                            )}
                          </div>

                          <h3 className="compact-title">{event.title}</h3>
                          <p className="compact-venue">
                            <i className="fa-solid fa-location-dot"></i>{" "}
                            {event.venueName || t.venueDefault}
                          </p>

                          <div className="compact-bottom-row">
                            <button
                              type="button"
                              className="btn-card-details"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectEvent(event);
                              }}
                            >
                              {t.showDetails} &rarr;
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

      {/* Floating View Switcher Bar for Mobile Smartphones (< 768px) */}
      <div className="mobile-floating-switcher">
        <button
          type="button"
          className={`mobile-switch-btn ${mobileTab === "map" ? "active" : ""}`}
          onClick={() => setMobileTab("map")}
        >
          <i className="fa-solid fa-map-location-dot"></i> Karte
        </button>
        <button
          type="button"
          className={`mobile-switch-btn ${mobileTab === "list" ? "active" : ""}`}
          onClick={() => setMobileTab("list")}
        >
          <i className="fa-solid fa-list"></i> Liste ({filteredEvents.length})
        </button>
      </div>

      {/* Sleek Municipal Footer Bar */}
      <footer className="app-footer-clean">
        <div className="footer-left">
          <span>WasGehtWien &bull; &copy; 2026</span>
          <span className="footer-divider">&bull;</span>
          <span className="footer-opendata">{t.openDataNotice}</span>
        </div>

        <div className="footer-right">
          <button
            type="button"
            className="btn-footer-link"
            onClick={() => setActiveModal("imprint")}
          >
            {t.imprint}
          </button>
          <span className="footer-divider">&bull;</span>
          <button
            type="button"
            className="btn-footer-link"
            onClick={() => setActiveModal("privacy")}
          >
            {t.privacyPolicy}
          </button>
        </div>
      </footer>

      {/* Impressum & Datenschutz Modal Overlay */}
      {activeModal && (
        <div className="modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {activeModal === "imprint" ? t.imprintTitle : t.privacyTitle}
              </h3>
              <button
                type="button"
                className="btn-close-modal"
                onClick={() => setActiveModal(null)}
                aria-label="Schließen / Close"
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              <p>
                {activeModal === "imprint" ? t.imprintText : t.privacyText}
              </p>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setActiveModal(null)}
              >
                {t.close}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
