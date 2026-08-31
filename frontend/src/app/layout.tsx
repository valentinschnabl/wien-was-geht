import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./leaflet.css";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://wienwasgeht.at";

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "WienWasGeht — Events heute in Wien & Vienna Events Today",
    template: "%s | WienWasGeht",
  },
  description:
    "Was geht heute in Wien? Finde tagesaktuelle Events, Konzerte, Club-Partys, Theater, Ausstellungen & Kultur-Highlights auf der interaktiven Live-Wien-Karte. Discover the best Vienna events today & tonight.",
  keywords: [
    "WienWasGeht",
    "Events heute in Wien",
    "Events Wien heute",
    "Wien heute Events",
    "Vienna events today",
    "Vienna today events",
    "Vienna events",
    "Things to do in Vienna today",
    "What to do in Vienna tonight",
    "Was geht heute in Wien",
    "Veranstaltungen Wien heute",
    "Events in Wien heute",
    "Konzerte Wien heute",
    "Partys Wien heute",
    "Wien Nightlife heute",
    "Kultur Wien heute",
    "Vienna concerts today",
    "Vienna nightlife today",
    "Wien Eventkalender",
    "Wien Heute",
  ],
  authors: [{ name: "WienWasGeht", url: "mailto:simplyycoding@gmail.com" }],
  creator: "WienWasGeht",
  publisher: "WienWasGeht",
  applicationName: "WienWasGeht",
  category: "events",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: "/",
    languages: {
      "de-AT": "/",
      "en-US": "/",
    },
  },
  openGraph: {
    title: "WienWasGeht — Events heute in Wien & Vienna Events Today",
    description:
      "Was geht heute in Wien? Entdecke tagesaktuelle Events, Live-Konzerte, Nightlife & Kultur auf der interaktiven Karte von Wien. Vienna events today & tonight.",
    url: siteUrl,
    siteName: "WienWasGeht",
    locale: "de_AT",
    type: "website",
    images: [
      {
        url: `${siteUrl}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "WienWasGeht — Interaktive Live-Event-Karte für Wien",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "WienWasGeht — Events heute in Wien & Vienna Events Today",
    description:
      "Tagesaktuelle Veranstaltungen, Club-Nächte, Konzerte und Kultur-Highlights in Wien auf der Live-Karte. What's on in Vienna today.",
    images: [`${siteUrl}/og-image.png`],
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/icon.svg",
    apple: "/apple-icon.svg",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Schema.org Structured Data (WebSite + WebApplication + FAQPage)
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        "url": siteUrl,
        "name": "WienWasGeht",
        "description": "Tagesaktuelle Events und Veranstaltungen in Wien auf einer interaktiven Live-Karte.",
        "inLanguage": ["de-AT", "en-US"],
        "potentialAction": {
          "@type": "SearchAction",
          "target": {
            "@type": "EntryPoint",
            "urlTemplate": `${siteUrl}/?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "WebApplication",
        "@id": `${siteUrl}/#app`,
        "name": "WienWasGeht — Wiener Event-Live-Karte",
        "url": siteUrl,
        "applicationCategory": "LifestyleApplication",
        "operatingSystem": "All",
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "EUR",
        },
        "about": {
          "@type": "Thing",
          "name": "Events in Wien heute",
          "description": "Echtzeit-Veranstaltungskalender für Musik, Kultur, Nightlife, Konzerte und Sport in Wien.",
        },
      },
      {
        "@type": "FAQPage",
        "@id": `${siteUrl}/#faq`,
        "mainEntity": [
          {
            "@type": "Question",
            "name": "Was geht heute in Wien?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Auf WienWasGeht findest du alle tagesaktuellen Events, Konzerte, Club-Partys, Theateraufführungen, Ausstellungen und Street-Food-Märkte heute in Wien auf einer interaktiven Live-Karte.",
            },
          },
          {
            "@type": "Question",
            "name": "What events are happening in Vienna today?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "WienWasGeht is a real-time live map showing all events happening today and tonight in Vienna, Austria, including live concerts, DJ sets, cultural exhibitions, and free community events.",
            },
          },
          {
            "@type": "Question",
            "name": "Wo finden heute Konzerte und Club-Partys in Wien statt?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "WienWasGeht aggregiert Live-Events aus den beliebtesten Wiener Locations und Clubs wie Arena Wien, Flex, Fluc, Porgy & Bess, Pratersauna, O der Klub, Konzerthaus und vielen mehr.",
            },
          },
          {
            "@type": "Question",
            "name": "Gibt es kostenlose Events heute in Wien? (Free things to do in Vienna today)",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Ja! Mit dem Filter 'Gratis / Free' filterst du in Sekundenschnelle alle eintrittsfreien Veranstaltungen, Open-Air-Konzerte, Vernissagen und Feste in Wien.",
            },
          },
        ],
      },
    ],
  };

  return (
    <html lang="de" className={`${geistSans.variable} ${geistMono.variable}`}>
      <head>
        <link rel="icon" type="image/svg+xml" href="/icon.svg" />
        <link rel="alternate icon" href="/favicon.svg" />
        <link rel="apple-touch-icon" href="/apple-icon.svg" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
