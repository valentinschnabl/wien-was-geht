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
  
  // Footer & Impressum / Privacy Modal
  imprint: string;
  privacyPolicy: string;
  openDataNotice: string;
  imprintTitle: string;
  imprintText: string;
  privacyTitle: string;
  privacyText: string;
  close: string;
}

export const translations: Record<Language, Translations> = {
  de: {
    appTitle: "WienWasGeht — Events & Kultur in Wien",
    appSubtitle: "Dein Guide für heutige Veranstaltungen, Konzerte und Kultur-Highlights in Wien.",
    eyebrow: "WienWasGeht",
    pwaBadge: "Datenschutzkonforme Ortung",
    mapTitle: "Karte von Wien",
    mapSubtitle: "Zentriert auf Wien (48.2082° N, 16.3738° O) mit lokaler Standort-Anzeige.",
    locateMe: "Mein Standort",
    locating: "Wird geortet...",
    locationActive: "Standort aktiv",
    locationDenied: "Standort nicht freigegeben (Wien Zentrum)",
    locationUnsupported: "Geolocation wird nicht unterstützt",
    myLocation: "Ihr aktueller Standort",
    locationPrivacyNotice: "Wird nur lokal auf Ihrem Gerät verarbeitet.",

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

    imprint: "Impressum",
    privacyPolicy: "Datenschutz",
    openDataNotice: "Datenquellen: Stadt Wien, Eventbrite, Ticketmaster, Eventfrog, Goodnight.at",
    imprintTitle: "Impressum & Offenlegung",
    imprintText: "WienWasGeht ist eine nicht-kommerzielle, tagesaktuelle Veranstaltungskarte zur Entdeckung und Visualisierung von Events im Großraum Wien.\n\nMedieninhaber & Betreiber:\nDipl.-Ing. Valentin Schnabl\nKontakt: valentin.cello@gmail.com\n\nVerwendete Datenquellen & Schnittstellen:\n• Stadt Wien Open Data (data.wien.gv.at, CC BY 4.0)\n• Eventbrite Platform API (Offizielle REST-Schnittstelle)\n• Ticketmaster Discovery API (Offizielle Entwickler-Schnittstelle)\n• Eventfrog Public API (Offizielle REST-Schnittstelle)\n• Goodnight.at (Öffentliche redaktionelle Übersicht mit direkter Verlinkung, ohne Bildspeicherung)\n\nHinweis für Veranstalter & Datenquellen (Notice & Takedown):\nSollten Sie als Veranstalter, Urheber oder Plattformbetreiber mit der Nennung, Verlinkung oder Anzeige einer Veranstaltung nicht einverstanden sein oder eine sofortige Entfernung wünschen, genügt eine formlose E-Mail an valentin.cello@gmail.com. Wir werden die betreffenden Daten umgehend und unbürokratisch offline nehmen.",
    privacyTitle: "Datenschutzerklärung (DSGVO)",
    privacyText: "Der Schutz Ihrer Daten hat für uns höchste Priorität.\n\n- Geolocation / Standort: Ihre GPS-Koordinaten verbleiben ausschließlich lokal in Ihrem Browser und werden niemals an unsere Server gesendet oder gespeichert.\n- Keine Erfassung von Tracking-Cookies.",
    close: "Schließen",
  },
  en: {
    appTitle: "WienWasGeht — Vienna Events Today",
    appSubtitle: "Your guide for today's events, concerts, and cultural highlights in Vienna.",
    eyebrow: "WienWasGeht",
    pwaBadge: "Privacy-Preserving Location",
    mapTitle: "Vienna Map View",
    mapSubtitle: "Centered on Vienna (48.2082° N, 16.3738° E) with local proximity awareness.",
    locateMe: "My Location",
    locating: "Locating...",
    locationActive: "Location Active",
    locationDenied: "Location Off (Vienna Center)",
    locationUnsupported: "Geolocation not supported",
    myLocation: "Your Location",
    locationPrivacyNotice: "Processed strictly locally on your device.",

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

    imprint: "Imprint",
    privacyPolicy: "Privacy Policy",
    openDataNotice: "Data Sources: City of Vienna, Eventbrite, Ticketmaster, Eventfrog, Goodnight.at",
    imprintTitle: "Legal Notice & Imprint",
    imprintText: "WienWasGeht is a non-commercial, real-time event map for discovering today's events in Vienna.\n\nMedia Owner & Operator:\nDipl.-Ing. Valentin Schnabl\nContact: valentin.cello@gmail.com\n\nConnected Data Sources & APIs:\n• City of Vienna Open Data (data.wien.gv.at, CC BY 4.0)\n• Eventbrite Platform API (Official REST API)\n• Ticketmaster Discovery API (Official Developer API)\n• Eventfrog Public API (Official REST API)\n• Goodnight.at (Public editorial directory with direct linking, no image reproduction)\n\nNotice for Organizers & Data Sources (Notice & Takedown):\nIf you are an event organizer, copyright holder, or platform operator and wish to have an event listing removed or blocked, please send an email to valentin.cello@gmail.com. We will promptly take down the requested entries without delay.",
    privacyTitle: "Privacy Policy (GDPR)",
    privacyText: "Protecting your privacy is our highest priority.\n\n- Geolocation / Location: Your GPS coordinates remain strictly local inside your browser and are never transmitted to our servers or stored.\n- No tracking cookies.",
    close: "Close",
  },
};
