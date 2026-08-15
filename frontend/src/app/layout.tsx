import type { Metadata } from "next";
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

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "WienWasGeht — Events, Partys & Veranstaltungen heute in Wien",
    template: "%s | WienWasGeht",
  },
  description:
    "Was geht heute in Wien? Finde tagesaktuelle Events, Konzerte, Club-Partys, Theater, Ausstellungen & Kultur-Highlights auf der interaktiven Live-Wien-Karte.",
  keywords: [
    "Events Wien heute",
    "Was geht heute in Wien",
    "Veranstaltungen Wien heute",
    "Events in Wien heute",
    "Konzerte Wien heute",
    "Partys Wien heute",
    "Wien Nightlife heute",
    "Kultur Wien heute",
    "Vienna events today",
    "Things to do in Vienna today",
    "What to do in Vienna tonight",
    "Wien Eventkalender",
    "Wien Heute",
    "WienWasGeht",
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
    title: "WienWasGeht — Events, Partys & Veranstaltungen heute in Wien",
    description:
      "Was geht heute in Wien? Entdecke tagesaktuelle Events, Live-Konzerte, Nightlife & Kultur auf der interaktiven Karte von Wien.",
    url: siteUrl,
    siteName: "WienWasGeht",
    locale: "de_AT",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "WienWasGeht — Events & Veranstaltungen heute in Wien",
    description:
      "Tagesaktuelle Veranstaltungen, Club-Nächte, Konzerte und Kultur-Highlights in Wien auf der Live-Karte.",
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
  // Schema.org Structured Data (WebSite + WebApplication + Event Discovery Service)
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
          "name": "Events in Wien",
          "description": "Echtzeit-Veranstaltungskalender für Musik, Kultur, Nightlife und Sport in Wien.",
        },
      },
    ],
  };

  return (
    <html lang="de" className={`${geistSans.variable} ${geistMono.variable}`}>
      <head>
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
