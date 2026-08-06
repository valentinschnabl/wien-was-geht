export type Language = 'de' | 'en';

export interface Translations {
  appTitle: string;
  appSubtitle: string;
  eyebrow: string;
  pwaBadge: string;
  mapTitle: string;
  mapSubtitle: string;
  locateMe: string;
  locating: string;
  locationActive: string;
  locationDenied: string;
  locationUnsupported: string;
  myLocation: string;
  locationPrivacyNotice: string;
  
  // Consent modal
  consentTitle: string;
  consentDescription: string;
  consentPrivacyPoint1: string;
  consentPrivacyPoint2: string;
  consentPrivacyPoint3: string;
  consentAllow: string;
  consentDecline: string;

  // Time & Status Badges
  statusLive: string;
  statusUpcoming: (time: string) => string;
  statusConcluded: string;
  eventsTodayNotice: string;

  // Filters
  filterCategory: string;
  filterAllCategories: string;
  filterMusic: string;
  filterCulture: string;
  filterSports: string;
  filterCulinary: string;
  filterNightlife: string;
  toggleConcluded: string;
  toggleConcludedHint: string;
  searchPlaceholder: string;

  // Events list
  eventsTitle: string;
  eventsCount: string;
  noEvents: string;
  distanceAway: (km: number) => string;
  showDetails: string;
  timeUnknown: string;
  startsAt: string;
  endsAt: string;
  externalLink: string;
  venueDefault: string;
  loadingEvents: string;
  errorLoading: string;
  
  // Privacy Footer / Badge
  privacyBadge: string;
}

export const translations: Record<Language, Translations> = {
  de: {
    appTitle: "Wien Heute — Veranstaltungen in Wien",
    appSubtitle: "Öffentliches Stadtportal für heutige Events, Ausstellungen und Kultur-Highlights.",
    eyebrow: "Stadt Wien Event-Karte (PWA)",
    pwaBadge: "Datenschutzkonforme Ortung",
    mapTitle: "Karte von Wien",
    mapSubtitle: "Zentriert auf Wien (48.2082° N, 16.3738° O) mit lokaler Standort-Anzeige.",
    locateMe: "Mein Standort",
    locating: "Wird geortet...",
    locationActive: "Standort aktiv",
    locationDenied: "Standort nicht freigegeben (Wien Zentrum)",
    locationUnsupported: "Geolocation wird nicht unterstützt",
    myLocation: "Ihr aktueller Standort",
    locationPrivacyNotice: "Standort wird ausschließlich lokal in Ihrem Browser verarbeitet (NFR-401).",

    consentTitle: "Standortfreigabe für Wien Heute",
    consentDescription: "Möchten Sie Ihren Standort auf der Karte anzeigen, um nahegelegene Events heute in Wien zu entdecken?",
    consentPrivacyPoint1: "Datenschutz: Ihre Standortdaten verbleiben nur in Ihrem Browser.",
    consentPrivacyPoint2: "Keine Speicherung: Koordinaten werden niemals an den Server gesendet (DSGVO / NFR-401).",
    consentPrivacyPoint3: "Freiwillig: Sie können die Karte auch ohne Freigabe nutzen.",
    consentAllow: "Standort teilen",
    consentDecline: "Ohne Standort fortfahren",

    statusLive: "● JETZT AKTIV",
    statusUpcoming: (time: string) => `🕒 HEUTE (ab ${time})`,
    statusConcluded: "⚪ HEUTE BEENDET",
    eventsTodayNotice: "Zeigt nur Events an, die am heutigen Tag stattfinden.",

    filterCategory: "Kategorie",
    filterAllCategories: "Alle Kategorien",
    filterMusic: "Musik & Konzerte",
    filterCulture: "Kunst & Kultur",
    filterSports: "Sport & Aktiv",
    filterCulinary: "Kulinarik",
    filterNightlife: "Nachtleben & Party",
    toggleConcluded: "Bereits beendete Events von heute anzeigen",
    toggleConcludedHint: "Zeigt auch Events an, die am heutigen Tag bereits geendet haben (FR-303).",
    searchPlaceholder: "Veranstaltung oder Ort suchen...",

    eventsTitle: "Veranstaltungen Heute",
    eventsCount: "Events heute in Wien",
    noEvents: "Keine Veranstaltungen für die gewählten Filter am heutigen Tag.",
    distanceAway: (km: number) => `${km.toFixed(1)} km entfernt`,
    showDetails: "Details anzeigen",
    timeUnknown: "Zeit unbekannt",
    startsAt: "Beginn",
    endsAt: "Ende",
    externalLink: "Offizielle Website & Info ↗",
    venueDefault: "Wien",
    loadingEvents: "Lade heutige Veranstaltungen...",
    errorLoading: "Fehler beim Laden der Eventdaten",

    privacyBadge: "🔒 DSGVO-konform: Standortverarbeitung ausschließlich lokal",
  },
  en: {
    appTitle: "Wien Heute — Vienna Events Today",
    appSubtitle: "Public city directory for today's events, exhibitions, and cultural highlights in Vienna.",
    eyebrow: "Vienna Public Event Map",
    pwaBadge: "Privacy-Preserving Location",
    mapTitle: "Vienna Map View",
    mapSubtitle: "Centered on Vienna (48.2082° N, 16.3738° E) with local proximity awareness.",
    locateMe: "My Location",
    locating: "Locating...",
    locationActive: "Location Active",
    locationDenied: "Location Off (Vienna Center)",
    locationUnsupported: "Geolocation not supported",
    myLocation: "Your Location",
    locationPrivacyNotice: "Your location stays local inside your browser (NFR-401).",

    consentTitle: "Share Location for Vienna Events",
    consentDescription: "Would you like to share your location to view nearby events happening in Vienna today?",
    consentPrivacyPoint1: "Privacy Protection: Coordinates stay on your device.",
    consentPrivacyPoint2: "No Server Upload: Your location is never sent to our servers (GDPR / NFR-401).",
    consentPrivacyPoint3: "Optional: You can proceed using standard Vienna map view.",
    consentAllow: "Share My Location",
    consentDecline: "Continue Without Location",

    statusLive: "● LIVE NOW",
    statusUpcoming: (time: string) => `🕒 TODAY (from ${time})`,
    statusConcluded: "⚪ ENDED TODAY",
    eventsTodayNotice: "Showing events happening today in Vienna.",

    filterCategory: "Category",
    filterAllCategories: "All Categories",
    filterMusic: "Music & Concerts",
    filterCulture: "Art & Culture",
    filterSports: "Sports & Fitness",
    filterCulinary: "Culinary",
    filterNightlife: "Nightlife & Party",
    toggleConcluded: "Show concluded events from today",
    toggleConcludedHint: "Includes events scheduled today that have already ended (FR-303).",
    searchPlaceholder: "Search event or venue name...",

    eventsTitle: "Events Today",
    eventsCount: "events today in Vienna",
    noEvents: "No events found matching your criteria for today.",
    distanceAway: (km: number) => `${km.toFixed(1)} km away`,
    showDetails: "View Details",
    timeUnknown: "Time unknown",
    startsAt: "Starts",
    endsAt: "Ends",
    externalLink: "Official Website & Tickets ↗",
    venueDefault: "Vienna",
    loadingEvents: "Loading today's events...",
    errorLoading: "Error loading event data",

    privacyBadge: "🔒 GDPR Compliant: Geolocation processed strictly on client",
  },
};
