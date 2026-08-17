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
  statusTomorrowUpcoming: (time: string) => string;
  statusTomorrow: string;
  statusConcluded: string;
  statsNow: string;
  statsLater: string;
  statsTomorrow: string;
  eventsTodayNotice: string;

  // Filters
  filterCategory: string;
  filterAllCategories: string;
  filterTomorrow: string;
  filterFree: string;
  badgeFree: string;
  filterMusic: string;
  filterCulture: string;
  filterSports: string;
  filterCulinary: string;
  filterNightlife: string;
  filterFamily: string;
  toggleConcluded: string;
  toggleConcludedHint: string;
  searchPlaceholder: string;

  // Events list
  eventsTitle: string;
  eventsTomorrowTitle: string;
  eventsCount: string;
  eventsTomorrowCount: string;
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
    appTitle: "WienWasGeht",
    appSubtitle: "Events & Kultur heute in Wien",
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

    statusLive: "JETZT",
    statusUpcoming: (time: string) => (time ? `HEUTE (ab ${time})` : "HEUTE"),
    statusTomorrowUpcoming: (time: string) => (time ? `MORGEN (ab ${time})` : "MORGEN"),
    statusTomorrow: "MORGEN",
    statusConcluded: "HEUTE BEENDET",
    statsNow: "Jetzt",
    statsLater: "Später",
    statsTomorrow: "Morgen",
    eventsTodayNotice: "Zeigt Events an, die in Wien stattfinden.",

    filterCategory: "Kategorie",
    filterAllCategories: "Alle",
    filterTomorrow: "Morgen",
    filterFree: "Eintritt frei",
    badgeFree: "EINTRITT FREI",
    filterMusic: "Musik",
    filterCulture: "Kultur",
    filterSports: "Sport",
    filterCulinary: "Kulinarik",
    filterNightlife: "Nightlife",
    filterFamily: "Familie",
    toggleConcluded: "Vergangene Events einblenden",
    toggleConcludedHint: "Zeigt auch Events an, die am heutigen Tag bereits geendet haben (FR-303).",
    searchPlaceholder: "Veranstaltung oder Ort suchen...",

    eventsTitle: "Events Heute",
    eventsTomorrowTitle: "Events Morgen",
    eventsCount: "Events heute in Wien",
    eventsTomorrowCount: "Events morgen in Wien",
    noEvents: "Keine Events gefunden, die den Kriterien entsprechen.",
    distanceAway: (km: number) => `${km.toFixed(1)} km entfernt`,
    showDetails: "Details ansehen",
    timeUnknown: "Uhrzeit unbekannt",
    startsAt: "Beginn",
    endsAt: "Ende",
    externalLink: "Offizielle Website & Tickets",
    venueDefault: "Wien",
    loadingEvents: "Lade Events...",
    errorLoading: "Fehler beim Laden der Events",

    imprint: "Impressum",
    privacyPolicy: "Datenschutz",
    openDataNotice: "Datenquellen: Offene Kultur-, Stadt- und Veranstaltungsdaten für Wien",
    imprintTitle: "Impressum & Offenlegung",
    imprintText: "Angaben gemäß § 5 ECG, § 25 Mediengesetz und Gewerbeordnung:\n\nMedieninhaber & Betreiber:\nDipl.-Ing. Valentin Schnabl\nMargaretenstraße 89/2\n1050 Wien, Österreich\nGewerbenummer (GISA): 40023236\nWebsite: https://valentin-schnabl.at\nE-Mail: simplyycoding@gmail.com\n\nProjektgegenstand:\nWienWasGeht ist eine nicht-kommerzielle Plattform zur tagesaktuellen Entdeckung und übersichtlichen Visualisierung von Kultur-, Musik-, Club- und Freizeitveranstaltungen im Großraum Wien.\n\nIntegrierte Datenquellen & Provider:\n• Stadt Wien Open Government Data (data.wien.gv.at / search.wien.gv.at)\n• FALTER Eventkalender (falter.at/events)\n• Eventfrog Wien (eventfrog.at)\n• Eventbrite Wien (eventbrite.com)\n• Ticketmaster Österreich (ticketmaster.at)\n• events.at (events.at/wien)\n• Goodnight.at (goodnight.at)\n• Resident Advisor Wien (ra.co/events/at/vienna)\n• ohschonhell.at (ohschonhell.at)\n• Capeet Wien (capeet.com)\n• eintrittfrei.at (eintrittfrei.at)\n• Kultursommer Wien (kultursommer.wien)\n• Luma Wien (lu.ma/vienna)\n\nZweck freiwilliger Zuwendungen:\nFreiwillige Unterstützungsbeiträge („Bier spendieren“) dienen ausschließlich zur Deckung der laufenden Betriebskosten für Domain, Hosting und Serverinfrastruktur zur dauerhaften Erhaltung dieses kostenlosen Angebots für Wien.\n\nHinweis für Veranstalter & Urheber (Notice & Takedown):\nSollten Sie als Veranstalter, Urheber oder Plattformbetreiber mit der Nennung, Verlinkung oder Anzeige einer Veranstaltung nicht einverstanden sein oder eine Korrektur/Entfernung wünschen, genügt eine formlose E-Mail an simplyycoding@gmail.com. Wir werden die betreffenden Daten umgehend und unbürokratisch offline nehmen.",
    privacyTitle: "Datenschutzerklärung (DSGVO)",
    privacyText: "Der Schutz Ihrer Daten hat für uns höchste Priorität.\n\n- Geolocation / Standort: Ihre GPS-Koordinaten verbleiben ausschließlich lokal in Ihrem Browser und werden niemals an unsere Server gesendet oder gespeichert.\n- Keine Erfassung von Tracking-Cookies.",
    close: "Schließen",
  },
  en: {
    appTitle: "WienWasGeht",
    appSubtitle: "Today's events & culture in Vienna",
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

    statusLive: "NOW",
    statusUpcoming: (time: string) => (time ? `TODAY (from ${time})` : "TODAY"),
    statusTomorrowUpcoming: (time: string) => (time ? `TOMORROW (from ${time})` : "TOMORROW"),
    statusTomorrow: "TOMORROW",
    statusConcluded: "ENDED TODAY",
    statsNow: "Now",
    statsLater: "Later",
    statsTomorrow: "Tomorrow",
    eventsTodayNotice: "Showing events happening in Vienna.",

    filterCategory: "Category",
    filterAllCategories: "All",
    filterTomorrow: "Tomorrow",
    filterFree: "Free Entry",
    badgeFree: "FREE ENTRY",
    filterMusic: "Music",
    filterCulture: "Culture",
    filterSports: "Sports",
    filterCulinary: "Culinary",
    filterNightlife: "Nightlife",
    filterFamily: "Family",
    toggleConcluded: "Show past events from today",
    toggleConcludedHint: "Includes events scheduled today that have already ended (FR-303).",
    searchPlaceholder: "Search event or venue name...",

    eventsTitle: "Events Today",
    eventsTomorrowTitle: "Events Tomorrow",
    eventsCount: "events today in Vienna",
    eventsTomorrowCount: "events tomorrow in Vienna",
    noEvents: "No events found matching your criteria.",
    distanceAway: (km: number) => `${km.toFixed(1)} km away`,
    showDetails: "View Details",
    timeUnknown: "Time unknown",
    startsAt: "Starts",
    endsAt: "Ends",
    externalLink: "Official Website & Tickets",
    venueDefault: "Vienna",
    loadingEvents: "Loading events...",
    errorLoading: "Error loading event data",

    imprint: "Imprint",
    privacyPolicy: "Privacy Policy",
    openDataNotice: "Data Sources: Open cultural, municipal, and public event feeds for Vienna",
    imprintTitle: "Legal Notice & Imprint",
    imprintText: "Legal Notice pursuant to § 5 Austrian E-Commerce Act (ECG) and § 25 Media Act:\n\nMedia Owner & Operator:\nDipl.-Ing. Valentin Schnabl\nMargaretenstraße 89/2\n1050 Vienna, Austria\nTrade License / GISA Reg. No.: 40023236\nWebsite: https://valentin-schnabl.at\nEmail: simplyycoding@gmail.com\n\nProject Scope:\nWienWasGeht is a non-commercial community platform for discovering and visualizing daily cultural, music, nightlife, and leisure events in the greater Vienna area.\n\nIntegrated Data Sources & Providers:\n• City of Vienna Open Government Data (data.wien.gv.at / search.wien.gv.at)\n• FALTER Event Calendar (falter.at/events)\n• Eventfrog Vienna (eventfrog.at)\n• Eventbrite Vienna (eventbrite.com)\n• Ticketmaster Austria (ticketmaster.at)\n• events.at (events.at/wien)\n• Goodnight.at (goodnight.at)\n• Resident Advisor Vienna (ra.co/events/at/vienna)\n• ohschonhell.at (ohschonhell.at)\n• Capeet Vienna (capeet.com)\n• eintrittfrei.at (eintrittfrei.at)\n• Kultursommer Vienna (kultursommer.wien)\n• Luma Vienna (lu.ma/vienna)\n\nPurpose of Voluntary Contributions:\nVoluntary support contributions ('Buy a beer') serve exclusively to cover ongoing operational expenses for domain, hosting, and server infrastructure to maintain this free service for Vienna.\n\nNotice for Organizers & Rightsholders (Notice & Takedown):\nIf you are an event organizer, copyright holder, or platform operator and wish to have an event listing removed or updated, please send an email to simplyycoding@gmail.com. We will promptly remove the entries without delay.",
    privacyTitle: "Privacy Policy (GDPR)",
    privacyText: "Protecting your privacy is our highest priority.\n\n- Geolocation / Location: Your GPS coordinates remain strictly local inside your browser and are never transmitted to our servers or stored.\n- No tracking cookies.",
    close: "Close",
  },
};

export function normalizeCategory(cat?: string | null): string {
  if (!cat) return "Culture";
  const c = cat.toLowerCase().trim();
  if (c === "music" || c === "musik" || c === "konzert") return "Music";
  if (c === "nightlife" || c === "party" || c === "clubbing" || c === "rave") return "Nightlife";
  if (c === "culture" || c === "kultur" || c === "theater" || c === "kunst" || c === "general") return "Culture";
  if (c === "sports" || c === "sport" || c === "fitness") return "Sports";
  if (c === "culinary" || c === "kulinarik" || c === "food") return "Culinary";
  if (c === "family" || c === "familie" || c === "kinder") return "Family";
  return "Culture";
}

export function getCategoryLabel(category?: string | null, language: Language = "de"): string {
  const norm = normalizeCategory(category);
  const t = translations[language];
  switch (norm) {
    case "Music":
      return t.filterMusic;
    case "Nightlife":
      return t.filterNightlife;
    case "Culture":
      return t.filterCulture;
    case "Family":
      return t.filterFamily;
    case "Sports":
      return t.filterSports;
    case "Culinary":
      return t.filterCulinary;
    default:
      return t.filterCulture;
  }
}
