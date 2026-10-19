import type { EventRecord } from "@/components/MapView";

export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.wienwasgeht.at";

export async function getInitialEvents(): Promise<EventRecord[]> {
  try {
    const rawApiBase =
      process.env.INTERNAL_API_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      "http://localhost:3000";
    const apiBase = rawApiBase.replace(/\/+$/, "");

    const res = await fetch(`${apiBase}/api/v1/events?limit=1000`, {
      next: { revalidate: 300 }, // ISR: refresh every 5 minutes
    });

    if (!res.ok) {
      return [];
    }

    const json = await res.json();
    return json.data ?? [];
  } catch {
    return [];
  }
}

export function safeIsoDate(dateStr?: string | null): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

export function generateEventJsonLd(
  events: EventRecord[],
  baseUrl: string,
  listName = "Events in Vienna today",
  listDescription = "Live events, concerts, nightlife and culture happening in Vienna today"
) {
  const validEvents = events
    .filter((ev) => ev.title && safeIsoDate(ev.startTime))
    .slice(0, 50);

  if (validEvents.length === 0) return null;

  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": listName,
    "description": listDescription,
    "numberOfItems": validEvents.length,
    "itemListElement": validEvents.map((ev, index) => {
      const startDate = safeIsoDate(ev.startTime)!;
      const endDate = safeIsoDate(ev.endTime);
      const eventUrl = ev.url || `${baseUrl}/?event=${encodeURIComponent(ev.id)}`;
      const imageUrl = ev.imageUrl || `${baseUrl}/og-image.png`;

      return {
        "@type": "ListItem",
        "position": index + 1,
        "item": {
          "@type": "Event",
          "@id": `${baseUrl}/?event=${encodeURIComponent(ev.id)}#event`,
          "name": ev.title,
          "description":
            ev.description ||
            `${ev.title} in Vienna (${ev.venueName || "Vienna"}). Live map and details on WienWasGeht.`,
          "startDate": startDate,
          ...(endDate ? { "endDate": endDate } : {}),
          "eventStatus": "https://schema.org/EventScheduled",
          "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
          "location": {
            "@type": "Place",
            "name": ev.venueName || "Vienna",
            "address": {
              "@type": "PostalAddress",
              "addressLocality": "Vienna",
              "postalCode": "1010",
              "addressCountry": "AT",
            },
            ...(typeof ev.latitude === "number" &&
            typeof ev.longitude === "number" &&
            ev.latitude !== 0
              ? {
                  "geo": {
                    "@type": "GeoCoordinates",
                    "latitude": ev.latitude,
                    "longitude": ev.longitude,
                  },
                }
              : {}),
          },
          "image": [imageUrl],
          "offers": {
            "@type": "Offer",
            "url": eventUrl,
            ...(ev.isFree === true ? { "price": "0" } : {}),
            "priceCurrency": "EUR",
            "availability": "https://schema.org/InStock",
          },
          "organizer": {
            "@type": "Organization",
            "name": ev.venueName || "WienWasGeht",
            "url": baseUrl,
          },
        },
      };
    }),
  };
}

export interface CategoryHubConfig {
  name: string;
  categoryKey?: string;
  onlyFree?: boolean;
  title: string;
  description: string;
  keywords: string[];
  heading: string;
  introText: string;
}

export const CATEGORY_TO_SLUG: Record<string, string> = {
  Nightlife: "nightlife",
  Music: "concerts",
  Culture: "culture",
  Family: "family",
  Sports: "sports",
  Culinary: "culinary",
};

export const SLUG_TO_CATEGORY: Record<string, string> = {
  nightlife: "Nightlife",
  concerts: "Music",
  culture: "Culture",
  family: "Family",
  sports: "Sports",
  culinary: "Culinary",
};

export const CATEGORIES_CONFIG: Record<string, CategoryHubConfig> = {
  nightlife: {
    name: "Clubs & Nightlife",
    categoryKey: "Nightlife",
    title: "Clubs & Nightlife in Vienna — Parties, Techno & Events | WienWasGeht",
    description:
      "What's on tonight in Vienna? Discover live club parties, techno raves, DJ sets, and nightlife events in Vienna on the interactive live map.",
    keywords: [
      "Clubs Vienna today",
      "Nightlife Vienna today",
      "Techno Vienna tonight",
      "Vienna parties today",
      "Vienna clubs events",
      "Was geht heute Nacht Wien",
    ],
    heading: "Nightlife, Clubs & Parties in Vienna",
    introText:
      "Discover the best DJ sets, parties, techno nights, and clubbing events in Vienna tonight at venues like Flex, Fluc, Pratersauna, Grelle Forelle, SASS and more.",
  },
  concerts: {
    name: "Concerts & Live Music",
    categoryKey: "Music",
    title: "Live Concerts in Vienna — Gigs & Live Music Today | WienWasGeht",
    description:
      "All live concerts today and tomorrow in Vienna: rock, indie, pop, jazz, classical, and singer-songwriter gigs on the interactive live event map.",
    keywords: [
      "Concerts Vienna today",
      "Live music Vienna today",
      "Vienna gigs today",
      "Vienna live concerts",
      "Konzerte Wien heute",
    ],
    heading: "Concerts & Live Music in Vienna",
    introText:
      "Find live concerts, gigs, jazz sessions, and band performances happening in Vienna today at venues like Arena Wien, Porgy & Bess, Konzerthaus, and Szene Wien.",
  },
  culture: {
    name: "Culture & Theatre",
    categoryKey: "Culture",
    title: "Culture, Theatre & Exhibitions in Vienna | WienWasGeht",
    description:
      "Theatre, cabaret, art exhibitions, and cultural highlights in Vienna today. Explore culture events on the interactive live Vienna map.",
    keywords: [
      "Culture Vienna today",
      "Theatre Vienna today",
      "Art exhibitions Vienna",
      "Museums Vienna today",
      "Kultur Wien heute",
    ],
    heading: "Culture, Theatre & Art Exhibitions in Vienna",
    introText:
      "Experience theatre plays, opera, museum vernissages, cabaret, and cultural performances in Vienna today.",
  },
  free: {
    name: "Free Events",
    onlyFree: true,
    title: "Free Events in Vienna — No Admission / Free Entry | WienWasGeht",
    description:
      "Free things to do in Vienna today: free concerts, open-air festivals, art shows, and community events with free admission.",
    keywords: [
      "Free events Vienna",
      "Free things to do in Vienna",
      "Free admission Vienna",
      "Gratis Events Wien",
      "Kostenlose Veranstaltungen Wien",
    ],
    heading: "Free Events & Free Things to Do in Vienna",
    introText:
      "Vienna doesn't have to be expensive: find all free admission events, outdoor gatherings, and free exhibitions happening today and tonight.",
  },
  family: {
    name: "Family & Kids",
    categoryKey: "Family",
    title: "Family & Kids Events in Vienna — Activities & Fun | WienWasGeht",
    description:
      "Family-friendly events, children's theatre, workshops, and outdoor fun today in Vienna on the interactive live map.",
    keywords: [
      "Family events Vienna",
      "Kids activities Vienna",
      "Vienna with kids today",
      "Familienveranstaltungen Wien",
    ],
    heading: "Family & Kids Activities in Vienna",
    introText:
      "The best family-friendly and children's activities, puppet theatre, creative workshops, and festivals in Vienna.",
  },
  sports: {
    name: "Sports & Fitness",
    categoryKey: "Sports",
    title: "Sports & Fitness Events in Vienna — Runs, Yoga & Games | WienWasGeht",
    description:
      "Sports events, public runs, outdoor fitness, yoga sessions, and tournaments in Vienna on the interactive live map.",
    keywords: [
      "Sports events Vienna",
      "Fitness Vienna today",
      "Running events Vienna",
      "Sport Events Wien",
    ],
    heading: "Sports, Fitness & Outdoor Events in Vienna",
    introText:
      "Stay active: find running groups, public tournaments, yoga in the park, and sports workshops in Vienna.",
  },
  culinary: {
    name: "Food & Street Food",
    categoryKey: "Culinary",
    title: "Food & Street Food Events in Vienna — Markets & Tastings | WienWasGeht",
    description:
      "Street food markets, food festivals, wine tastings, and culinary pop-ups today in Vienna on the live map.",
    keywords: [
      "Food events Vienna",
      "Street food Vienna",
      "Food festival Vienna today",
      "Kulinarik Wien",
    ],
    heading: "Culinary, Food Markets & Tastings in Vienna",
    introText:
      "Explore food festivals, weekly street food markets, and tastings in Vienna.",
  },
};

export interface LocationHubConfig {
  name: string;
  searchTerm: string;
  title: string;
  description: string;
  keywords: string[];
}

export const LOCATIONS_CONFIG: Record<string, LocationHubConfig> = {
  "arena-wien": {
    name: "Arena Wien",
    searchTerm: "Arena Wien",
    title: "Events at Arena Wien — Concerts & Open-Air Schedule | WienWasGeht",
    description:
      "Current event schedule at Arena Wien (Baumgasse, Erdberg): live concerts, open-airs, and club nights on the live map.",
    keywords: ["Arena Wien", "Arena Wien schedule", "Arena Wien concerts", "Arena Wien events"],
  },
  "flex": {
    name: "Flex",
    searchTerm: "Flex",
    title: "Events at Flex Vienna — Concerts & Club Nights | WienWasGeht",
    description:
      "Current program at the legendary Flex on the Danube Canal: live gigs, drum & bass, techno, and club nights on the live map.",
    keywords: ["Flex Vienna", "Flex Danube Canal", "Flex club Vienna", "Flex events"],
  },
  "fluc": {
    name: "Fluc & Fluc Wanne",
    searchTerm: "Fluc",
    title: "Events at Fluc & Fluc Wanne — Program at Praterstern | WienWasGeht",
    description:
      "Live gigs, parties, and electronic music at Fluc and Fluc Wanne at Praterstern. Live event calendar on WienWasGeht.",
    keywords: ["Fluc Vienna", "Fluc Wanne", "Fluc Praterstern", "Fluc events"],
  },
  "pratersauna": {
    name: "Pratersauna",
    searchTerm: "Pratersauna",
    title: "Parties at Pratersauna Vienna — Clubbing & Open-Air | WienWasGeht",
    description:
      "Club nights, pool sessions, and electronic beats at Pratersauna in Vienna's Prater on the interactive live map.",
    keywords: ["Pratersauna", "Pratersauna Vienna", "Pratersauna clubbing", "Pratersauna party"],
  },
  "sass": {
    name: "SASS Music Club",
    searchTerm: "SASS",
    title: "Events at SASS Music Club — Electronic Music at Karlsplatz | WienWasGeht",
    description:
      "House, techno, and intimate club culture at SASS Music Club at Karlsplatz, Vienna. Today's live events on WienWasGeht.",
    keywords: ["SASS Music Club", "SASS Karlsplatz", "SASS Vienna", "SASS club"],
  },
  "porgy-bess": {
    name: "Porgy & Bess",
    searchTerm: "Porgy & Bess",
    title: "Concerts at Porgy & Bess — Vienna Jazz & Music Club | WienWasGeht",
    description:
      "Live concert program at Porgy & Bess jazz club in Riemergasse: jazz, world music, and live concerts on the map.",
    keywords: ["Porgy and Bess Vienna", "Porgy Bess jazz club", "Porgy Bess concerts"],
  },
  "wiener-konzerthaus": {
    name: "Wiener Konzerthaus",
    searchTerm: "Konzerthaus",
    title: "Concerts at Wiener Konzerthaus — Classical, Jazz & Pop | WienWasGeht",
    description:
      "Current schedule at Wiener Konzerthaus on Lothringerstraße: classical performances, chamber orchestra, world music, and concerts.",
    keywords: ["Wiener Konzerthaus", "Konzerthaus Vienna schedule", "Vienna concert hall"],
  },
  "chelsea": {
    name: "Chelsea",
    searchTerm: "Chelsea",
    title: "Events at Chelsea Vienna — Live Gigs & Britpop at the Arches | WienWasGeht",
    description:
      "Concerts, indie gigs, and DJ nights at Chelsea under the historic Vienna Gürtel Stadtbahn arches.",
    keywords: ["Chelsea Vienna", "Chelsea Gürtel", "Chelsea club Vienna", "Chelsea concerts"],
  },
  "the-loft": {
    name: "The Loft",
    searchTerm: "The Loft",
    title: "Events at The Loft Vienna — Parties, Slams & Gigs | WienWasGeht",
    description:
      "Current schedule at The Loft at Lerchenfelder Gürtel: 90s parties, poetry slams, live concerts, and DJ club nights.",
    keywords: ["The Loft Vienna", "The Loft Gürtel", "The Loft parties", "The Loft schedule"],
  },
  "das-werk": {
    name: "Das WERK",
    searchTerm: "Das WERK",
    title: "Events at Das WERK Vienna — Art & Underground Club Culture | WienWasGeht",
    description:
      "Electronic music, art, and underground nightlife at Das WERK at Spittelauer Lände on the Danube Canal.",
    keywords: ["Das WERK Vienna", "Das WERK Spittelau", "Das WERK club", "Das WERK events"],
  },
  "grelle-forelle": {
    name: "Grelle Forelle",
    searchTerm: "Grelle Forelle",
    title: "Events at Grelle Forelle — Techno & Underground at the Canal | WienWasGeht",
    description:
      "Top techno lineups and underground electronic music at Grelle Forelle at Spittelauer Lände on the live map.",
    keywords: ["Grelle Forelle", "Grelle Forelle techno", "Grelle Forelle Vienna", "Grelle Forelle schedule"],
  },
};
