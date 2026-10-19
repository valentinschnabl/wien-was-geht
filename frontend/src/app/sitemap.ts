import { MetadataRoute } from "next";
import { CATEGORIES_CONFIG, LOCATIONS_CONFIG } from "@/lib/events";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.wienwasgeht.at";

  const categoryEntries: MetadataRoute.Sitemap = Object.keys(
    CATEGORIES_CONFIG
  ).map((slug) => ({
    url: `${baseUrl}/category/${slug}`,
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: 0.9,
  }));

  const venueEntries: MetadataRoute.Sitemap = Object.keys(
    LOCATIONS_CONFIG
  ).map((slug) => ({
    url: `${baseUrl}/venue/${slug}`,
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: 0.8,
  }));

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 1.0,
      alternates: {
        languages: {
          "de-AT": baseUrl,
          "en-US": `${baseUrl}/?lang=en`,
          "x-default": baseUrl,
        },
      },
    },
    {
      url: `${baseUrl}/?lang=en`,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/tomorrow`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/weekend`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    ...categoryEntries,
    ...venueEntries,
  ];
}
