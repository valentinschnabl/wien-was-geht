import { notFound } from "next/navigation";
import type { Metadata } from "next";
import EventMap from "@/components/EventMap";
import {
  LOCATIONS_CONFIG,
  getInitialEvents,
  generateEventJsonLd,
  siteUrl,
  SLUG_TO_CATEGORY,
} from "@/lib/events";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ when?: string; free?: string; category?: string; lang?: string; event?: string }>;
};

export async function generateStaticParams() {
  return Object.keys(LOCATIONS_CONFIG).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const config = LOCATIONS_CONFIG[slug];
  if (!config) return {};

  const pageUrl = `${siteUrl}/venue/${slug}`;

  return {
    title: config.title,
    description: config.description,
    keywords: config.keywords,
    alternates: {
      canonical: pageUrl,
    },
    openGraph: {
      title: config.title,
      description: config.description,
      url: pageUrl,
      siteName: "WienWasGeht",
      locale: "de_AT",
      type: "website",
      images: [
        {
          url: `${siteUrl}/og-image.png`,
          width: 1200,
          height: 630,
          alt: config.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: config.title,
      description: config.description,
      images: [`${siteUrl}/og-image.png`],
    },
  };
}

export default async function VenuePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const config = LOCATIONS_CONFIG[slug];

  if (!config) {
    notFound();
  }

  const resolvedSearchParams = searchParams ? await searchParams : {};
  const isTomorrow = resolvedSearchParams.when === "tomorrow";
  const isLive = resolvedSearchParams.when === "live";
  const isFree = resolvedSearchParams.free === "true";
  const categorySlug = resolvedSearchParams.category;
  const initialCategory = categorySlug ? SLUG_TO_CATEGORY[categorySlug] : undefined;

  const initialEvents = await getInitialEvents();

  // Filter events for this venue for structured data
  const venueEvents = initialEvents.filter((ev) => {
    const matchesVenue =
      ev.venueName?.toLowerCase().includes(config.searchTerm.toLowerCase()) ??
      false;
    if (!matchesVenue) return false;
    if (isFree && ev.isFree !== true) return false;
    return true;
  });

  const heading = `Events & Schedule at ${config.name} Vienna`;
  const eventJsonLd = generateEventJsonLd(
    venueEvents,
    siteUrl,
    heading,
    config.description
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
        <p>{config.description}</p>

        {venueEvents.length > 0 && (
          <div>
            <h3>Upcoming Events at {config.name}</h3>
            <ul>
              {venueEvents.map((ev) => (
                <li key={ev.id}>
                  <strong>{ev.title}</strong>
                  {ev.category ? ` (${ev.category})` : ""}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Pre-filtered Map View focused on the specific Venue */}
      <EventMap
        initialEvents={initialEvents}
        initialSearchQuery={config.searchTerm}
        initialCategory={initialCategory}
        initialOnlyFree={isFree}
        initialQuickFilter={isTomorrow ? "tomorrow" : isLive ? "live" : undefined}
      />
    </main>
  );
}
