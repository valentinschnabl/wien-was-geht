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
  title: "Weekend Events in Vienna — What's on This Weekend? | WienWasGeht",
  description:
    "What to do this weekend in Vienna? The best live concerts, club parties, flea markets, and culture highlights on the interactive live Vienna map.",
  keywords: [
    "Vienna events weekend",
    "What to do in Vienna this weekend",
    "Vienna weekend parties",
    "Vienna nightlife weekend",
    "Events Wien Wochenende",
  ],
  alternates: {
    canonical: `${siteUrl}/weekend`,
  },
  openGraph: {
    title: "Weekend Events in Vienna — What's on This Weekend? | WienWasGeht",
    description:
      "The best events, concerts, parties, and markets this weekend in Vienna on the live map.",
    url: `${siteUrl}/weekend`,
    siteName: "WienWasGeht",
    locale: "de_AT",
    type: "website",
    images: [
      {
        url: `${siteUrl}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "Weekend events in Vienna",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Weekend Events in Vienna — What's on This Weekend? | WienWasGeht",
    description:
      "The best events, concerts, parties, and markets this weekend in Vienna on the live map.",
    images: [`${siteUrl}/og-image.png`],
  },
};

export default async function WeekendPage({ searchParams }: Props) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const isFree = resolvedSearchParams.free === "true";
  const categorySlug = resolvedSearchParams.category;
  const initialCategory = categorySlug ? SLUG_TO_CATEGORY[categorySlug] : undefined;

  const initialEvents = await getInitialEvents();

  const heading = "Events & Highlights This Weekend in Vienna";
  const eventJsonLd = generateEventJsonLd(
    initialEvents,
    siteUrl,
    heading,
    "Highlights for the weekend in Vienna: concerts, nightlife, markets, and culture."
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
          What&apos;s on this weekend in Vienna? Find the best parties, live concerts,
          art exhibitions, and street food gatherings for Friday, Saturday, and Sunday.
        </p>
      </section>

      {/* Map view */}
      <EventMap
        initialEvents={initialEvents}
        initialOnlyFree={isFree}
        initialCategory={initialCategory}
      />
    </main>
  );
}
