import { notFound } from "next/navigation";
import type { Metadata } from "next";
import EventMap from "@/components/EventMap";
import {
  CATEGORIES_CONFIG,
  getInitialEvents,
  generateEventJsonLd,
  siteUrl,
} from "@/lib/events";
import { normalizeCategory } from "@/lib/i18n";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ when?: string; free?: string; lang?: string; event?: string }>;
};

export async function generateStaticParams() {
  return Object.keys(CATEGORIES_CONFIG).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const config = CATEGORIES_CONFIG[slug];
  if (!config) return {};

  const pageUrl = `${siteUrl}/category/${slug}`;

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

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const config = CATEGORIES_CONFIG[slug];

  if (!config) {
    notFound();
  }

  const resolvedSearchParams = searchParams ? await searchParams : {};
  const isTomorrow = resolvedSearchParams.when === "tomorrow";
  const isLive = resolvedSearchParams.when === "live";
  const isFree = resolvedSearchParams.free === "true" || config.onlyFree;

  const initialEvents = await getInitialEvents();

  // Filter events specifically for this category's JSON-LD Structured Data
  const categoryEvents = initialEvents.filter((ev) => {
    if (isFree && ev.isFree !== true) {
      return false;
    }
    if (config.categoryKey) {
      return normalizeCategory(ev.category) === normalizeCategory(config.categoryKey);
    }
    return true;
  });

  const eventJsonLd = generateEventJsonLd(
    categoryEvents,
    siteUrl,
    config.heading,
    config.description
  );

  const eventHighlights = categoryEvents.slice(0, 20);

  return (
    <main className="main-wrapper">
      {eventJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(eventJsonLd) }}
        />
      )}

      {/* Semantic Crawler & Screen Reader Structure (Indexed by Googlebot) */}
      <section className="sr-only" aria-label={config.heading}>
        <h2>{config.heading}</h2>
        <p>{config.introText}</p>

        {eventHighlights.length > 0 && (
          <div>
            <h3>Current {config.name} Highlights in Vienna</h3>
            <ul>
              {eventHighlights.map((ev) => (
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

      {/* Pre-filtered Interactive Map View */}
      <EventMap
        initialEvents={initialEvents}
        initialCategory={config.categoryKey}
        initialOnlyFree={isFree}
        initialQuickFilter={isTomorrow ? "tomorrow" : isLive ? "live" : undefined}
      />
    </main>
  );
}
