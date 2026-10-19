import type { Metadata } from "next";
import EventMap from "@/components/EventMap";
import {
  getInitialEvents,
  generateEventJsonLd,
  siteUrl,
  SLUG_TO_CATEGORY,
} from "@/lib/events";

type Props = {
  searchParams?: Promise<{ free?: string; category?: string; lang?: string; event?: string }>;
};

export const metadata: Metadata = {
  title: "Events Tomorrow in Vienna — Concerts, Parties & Culture | WienWasGeht",
  description:
    "What's on tomorrow in Vienna? Find live concerts, club parties, theatre, and culture highlights for tomorrow in Vienna on the interactive live map.",
  keywords: [
    "Events tomorrow in Vienna",
    "Vienna events tomorrow",
    "Things to do in Vienna tomorrow",
    "Vienna concerts tomorrow",
    "Events morgen Wien",
  ],
  alternates: {
    canonical: `${siteUrl}/tomorrow`,
  },
  openGraph: {
    title: "Events Tomorrow in Vienna — Concerts, Parties & Culture | WienWasGeht",
    description:
      "What's on tomorrow in Vienna? Discover live concerts, club nights, and exhibitions tomorrow on the interactive map.",
    url: `${siteUrl}/tomorrow`,
    siteName: "WienWasGeht",
    locale: "de_AT",
    type: "website",
    images: [
      {
        url: `${siteUrl}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "Events tomorrow in Vienna",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Events Tomorrow in Vienna — Concerts, Parties & Culture | WienWasGeht",
    description:
      "What's on tomorrow in Vienna? Discover live concerts, club nights, and exhibitions tomorrow on the interactive map.",
    images: [`${siteUrl}/og-image.png`],
  },
};

export default async function TomorrowPage({ searchParams }: Props) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const isFree = resolvedSearchParams.free === "true";
  const categorySlug = resolvedSearchParams.category;
  const category = categorySlug ? SLUG_TO_CATEGORY[categorySlug] : undefined;

  const initialEvents = await getInitialEvents();

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStart = new Date(tomorrow.setHours(0, 0, 0, 0));
  const tomorrowEnd = new Date(tomorrow.setHours(23, 59, 59, 999));

  const tomorrowEvents = initialEvents.filter((ev) => {
    if (!ev.startTime) return false;
    const start = new Date(ev.startTime);
    const end = ev.endTime ? new Date(ev.endTime) : start;
    if (!(start <= tomorrowEnd && end >= tomorrowStart)) return false;
    if (isFree && ev.isFree !== true) return false;
    return true;
  });

  const heading = "Events & Highlights Tomorrow in Vienna";
  const eventJsonLd = generateEventJsonLd(
    tomorrowEvents,
    siteUrl,
    heading,
    "All live concerts, club nights, exhibitions and events happening tomorrow in Vienna."
  );

  return (
    <main className="main-wrapper">
      {eventJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(eventJsonLd) }}
        />
      )}

      {/* Semantic Crawler Structure (Indexed by Googlebot) */}
      <section className="sr-only" aria-label={heading}>
        <h2>{heading}</h2>
        <p>
          Plan your day tomorrow in Vienna: live music, theatre, art vernissages,
          clubbing, and events tomorrow on the interactive live map.
        </p>

        {tomorrowEvents.length > 0 && (
          <div>
            <h3>Highlights Tomorrow in Vienna</h3>
            <ul>
              {tomorrowEvents.slice(0, 20).map((ev) => (
                <li key={ev.id}>
                  <strong>{ev.title}</strong>
                  {ev.venueName ? ` — Location: ${ev.venueName}` : ""}
                  {ev.category ? ` (${ev.category})` : ""}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Map view automatically set to tomorrow */}
      <EventMap
        initialEvents={initialEvents}
        initialQuickFilter="tomorrow"
        initialOnlyFree={isFree}
        initialCategory={category}
      />
    </main>
  );
}
