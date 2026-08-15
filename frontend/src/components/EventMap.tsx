"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, useMemo, useRef } from "react";
import { translations, Language, normalizeCategory, getCategoryLabel } from "@/lib/i18n";
import LanguageSwitcher from "./LanguageSwitcher";
import type { EventRecord, UserLocation } from "./MapView";
import { calculateDistanceKm } from "@/lib/distance";

const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => <div className="map-loading">Lade Karte...</div>,
});

function formatEventDateRange(
  startStr: string | null | undefined,
  endStr: string | null | undefined,
  lang: "de" | "en"
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

export default function EventMap() {
  const [language, setLanguage] = useState<Language>("de");
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
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

  // Track whether event was opened from Map or List to route back appropriately
  const [selectionSource, setSelectionSource] = useState<"map" | "list">("map");

  // Smooth scroll sidebar to hovered event card
  useEffect(() => {
    if (hoveredEventId && cardRefs.current[hoveredEventId]) {
      cardRefs.current[hoveredEventId]?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [hoveredEventId]);

  const handleHoverEvent = (id: string | null) => {
    setHoveredEventId(id);
  };

  const handleSelectEvent = (event: EventRecord, source: "map" | "list" = "map") => {
    setSelectionSource(source);
    setSelectedEvent(event);
    setHoveredEventId(event.id); // Automatically mark the event with the RED highlighted pin
    setMobileTab("list"); // On mobile, automatically switch to detailed view panel
  };

  const handleBackFromDetail = () => {
    setSelectedEvent(null);
    setHoveredEventId(null);
    if (selectionSource === "map") {
      setMobileTab("map");
    } else {
      setMobileTab("list");
    }
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
    const rawApiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
    const apiBase = rawApiBase.replace(/\/+$/, "");

    const loadEvents = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${apiBase}/api/v1/events?today=true&limit=1000`);
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


  // Filter events: SCOPED TO TODAY
  const filteredEvents = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

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

        // Category Filter
        if (selectedCategory !== "all") {
          const normEvCat = normalizeCategory(ev.category);
          const normSelected = normalizeCategory(selectedCategory);
          if (normEvCat !== normSelected) {
            return false;
          }
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
  }, [events, userLocation, includeConcluded, searchQuery, quickFilter, selectedCategory]);

  // Compute category event counts for badges
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: 0,
      Culture: 0,
      Nightlife: 0,
      Music: 0,
      Family: 0,
      Sports: 0,
      Culinary: 0,
    };

    events.forEach((ev) => {
      counts.all++;
      const norm = normalizeCategory(ev.category);
      if (counts[norm] !== undefined) {
        counts[norm]++;
      }
    });

    return counts;
  }, [events]);

  // Compute total live & upcoming counts for today's filtered events
  const eventStats = useMemo(() => {
    let liveCount = 0;
    let upcomingCount = 0;

    filteredEvents.forEach((ev) => {
      if (ev.temporalStatus === "live") {
        liveCount++;
      } else if (ev.temporalStatus === "upcoming") {
        upcomingCount++;
      }
    });

    return { liveCount, upcomingCount };
  }, [filteredEvents]);


  return (
    <div className="app-container-clean">
      {/* Rebranded Header */}
      <header className="app-header-clean">
        <div className="header-branding">
          <div className="city-badge-row">
            <span className="city-badge">
              <i className="fa-solid fa-city"></i> WienWasGeht
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
      {/* Global Category & Live Filter Bar (Always accessible on both Map & List views on Mobile & Desktop) */}
      <div className="global-category-bar">
        <div className="category-chips-scroll">
          <button
            type="button"
            className={`cat-chip ${selectedCategory === "all" && quickFilter === "all" ? "active" : ""}`}
            onClick={() => {
              setSelectedCategory("all");
              setQuickFilter("all");
              setSelectedEvent(null);
            }}
          >
            <i className="fa-solid fa-layer-group"></i>
            <span>{t.filterAllCategories} ({categoryCounts.all})</span>
          </button>

          <button
            type="button"
            className={`cat-chip cat-chip-live ${quickFilter === "live" ? "active" : ""}`}
            onClick={() => {
              setQuickFilter(quickFilter === "live" ? "all" : "live");
              setSelectedEvent(null);
            }}
          >
            <i className="fa-solid fa-bolt"></i>
            <span>LIVE ({eventStats.liveCount})</span>
          </button>

          <button
            type="button"
            className={`cat-chip ${selectedCategory === "Culture" ? "active" : ""}`}
            onClick={() => {
              setSelectedCategory(selectedCategory === "Culture" ? "all" : "Culture");
              setSelectedEvent(null);
            }}
          >
            <i className="fa-solid fa-masks-theater"></i>
            <span>{t.filterCulture} ({categoryCounts.Culture})</span>
          </button>

          <button
            type="button"
            className={`cat-chip ${selectedCategory === "Nightlife" ? "active" : ""}`}
            onClick={() => {
              setSelectedCategory(selectedCategory === "Nightlife" ? "all" : "Nightlife");
              setSelectedEvent(null);
            }}
          >
            <i className="fa-solid fa-moon"></i>
            <span>{t.filterNightlife} ({categoryCounts.Nightlife})</span>
          </button>

          <button
            type="button"
            className={`cat-chip ${selectedCategory === "Music" ? "active" : ""}`}
            onClick={() => {
              setSelectedCategory(selectedCategory === "Music" ? "all" : "Music");
              setSelectedEvent(null);
            }}
          >
            <i className="fa-solid fa-music"></i>
            <span>{t.filterMusic} ({categoryCounts.Music})</span>
          </button>

          <button
            type="button"
            className={`cat-chip ${selectedCategory === "Family" ? "active" : ""}`}
            onClick={() => {
              setSelectedCategory(selectedCategory === "Family" ? "all" : "Family");
              setSelectedEvent(null);
            }}
          >
            <i className="fa-solid fa-children"></i>
            <span>{t.filterFamily} ({categoryCounts.Family})</span>
          </button>

          <button
            type="button"
            className={`cat-chip ${selectedCategory === "Sports" ? "active" : ""}`}
            onClick={() => {
              setSelectedCategory(selectedCategory === "Sports" ? "all" : "Sports");
              setSelectedEvent(null);
            }}
          >
            <i className="fa-solid fa-futbol"></i>
            <span>{t.filterSports} ({categoryCounts.Sports})</span>
          </button>

          <button
            type="button"
            className={`cat-chip ${selectedCategory === "Culinary" ? "active" : ""}`}
            onClick={() => {
              setSelectedCategory(selectedCategory === "Culinary" ? "all" : "Culinary");
              setSelectedEvent(null);
            }}
          >
            <i className="fa-solid fa-utensils"></i>
            <span>{t.filterCulinary} ({categoryCounts.Culinary})</span>
          </button>
        </div>
      </div>

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
              onSelectEvent={(event) => handleSelectEvent(event, "map")}
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
                onClick={handleBackFromDetail}
              >
                <i className="fa-solid fa-arrow-left"></i>{" "}
                {selectionSource === "map"
                  ? language === "de"
                    ? "Zurück zur Karte"
                    : "Back to map"
                  : language === "de"
                  ? "Zurück zur Liste"
                  : "Back to list"}
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
                    <span className="badge badge-live">
                      <i className="fa-solid fa-circle badge-dot"></i> {t.statusLive}
                    </span>
                  )}
                  {selectedEvent.temporalStatus === "upcoming" && (
                    <span className="badge badge-upcoming">
                      <i className="fa-solid fa-clock"></i> {t.statusUpcoming("")}
                    </span>
                  )}
                  {selectedEvent.temporalStatus === "concluded" && (
                    <span className="badge badge-concluded">
                      <i className="fa-solid fa-circle badge-dot"></i> {t.statusConcluded}
                    </span>
                  )}

                  {typeof selectedEvent.distanceKm === "number" && (
                    <span className="distance-pill">
                      <i className="fa-solid fa-location-arrow"></i>{" "}
                      {selectedEvent.distanceKm.toFixed(1)} km
                    </span>
                  )}
                </div>

                <h3 className="sidebar-detail-title">{selectedEvent.title}</h3>

                <div className="sidebar-detail-meta">
                  <div>
                    <i className="fa-solid fa-location-dot"></i>{" "}
                    <strong>{selectedEvent.venueName || t.venueDefault}</strong>
                  </div>
                  <div>
                    <i className="fa-solid fa-calendar-days"></i>{" "}
                    {formatEventDateRange(
                      selectedEvent.startTime,
                      selectedEvent.endTime,
                      language
                    )}
                  </div>
                  <div>
                    <i className="fa-solid fa-tag"></i>{" "}
                    <span>{getCategoryLabel(selectedEvent.category, language)}</span>
                  </div>
                </div>

                <div className="sidebar-detail-description">
                  <h4>{language === "de" ? "Beschreibung" : "Description"}</h4>
                  <p>
                    {selectedEvent.description ||
                      (language === "de"
                        ? "Keine nähere Beschreibung verfügbar."
                        : "No detailed description available.")}
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
            /* COMPACT EVENT LIST VIEW */
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
                      onClick={() => handleSelectEvent(event, "list")}
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
                              <span className="badge badge-live">
                                <i className="fa-solid fa-circle badge-dot"></i> {t.statusLive}
                              </span>
                            )}
                            {event.temporalStatus === "upcoming" && (
                              <span className="badge badge-upcoming">
                                <i className="fa-solid fa-clock"></i>{" "}
                                {t.statusUpcoming(startTimeStr)}
                              </span>
                            )}
                            {event.temporalStatus === "concluded" && (
                              <span className="badge badge-concluded">
                                <i className="fa-solid fa-circle badge-dot"></i> {t.statusConcluded}
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

                          <p className="compact-time-range">
                            <i className="fa-solid fa-calendar-days"></i>{" "}
                            {formatEventDateRange(event.startTime, event.endTime, language)}
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
          <span>WienWasGeht &bull; &copy; 2026</span>
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
