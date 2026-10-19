import { describe, it, expect } from "vitest";
import {
  generateStaticParams as generateCategoryStaticParams,
  generateMetadata as generateCategoryMetadata,
} from "./category/[slug]/page";
import {
  generateStaticParams as generateVenueStaticParams,
  generateMetadata as generateVenueMetadata,
} from "./venue/[slug]/page";
import { metadata as tomorrowMetadata } from "./tomorrow/page";
import { metadata as weekendMetadata } from "./weekend/page";
import { CATEGORIES_CONFIG, LOCATIONS_CONFIG } from "@/lib/events";

describe("Hub Pages — Static Generation & Metadata", () => {
  describe("Category Hubs (/category/[slug])", () => {
    it("should generate static parameters for all 7 categories", async () => {
      const params = await generateCategoryStaticParams();
      expect(params).toHaveLength(7);
      const slugs = params.map((p) => p.slug);
      expect(slugs).toEqual(Object.keys(CATEGORIES_CONFIG));
    });

    it("should generate SEO metadata with canonical, title, and OG image for category", async () => {
      const meta = await generateCategoryMetadata({
        params: Promise.resolve({ slug: "nightlife" }),
      });

      expect(meta.title).toContain("Clubs & Nightlife in Vienna");
      expect(meta.description).toContain("nightlife events in Vienna");
      expect(meta.alternates?.canonical).toBe(
        "https://www.wienwasgeht.at/category/nightlife"
      );
      expect(meta.openGraph?.images).toEqual([
        {
          url: "https://www.wienwasgeht.at/og-image.png",
          width: 1200,
          height: 630,
          alt: meta.title,
        },
      ]);
      expect(meta.openGraph?.siteName).toBe("WienWasGeht");
    });

    it("should return empty metadata for unknown category slug", async () => {
      const meta = await generateCategoryMetadata({
        params: Promise.resolve({ slug: "non-existent-category" }),
      });
      expect(meta).toEqual({});
    });
  });

  describe("Venue Hubs (/venue/[slug])", () => {
    it("should generate static parameters for all 11 venues", async () => {
      const params = await generateVenueStaticParams();
      expect(params).toHaveLength(Object.keys(LOCATIONS_CONFIG).length);
      const slugs = params.map((p) => p.slug);
      expect(slugs).toEqual(Object.keys(LOCATIONS_CONFIG));
    });

    it("should generate SEO metadata with canonical, title, and keywords for venue", async () => {
      const meta = await generateVenueMetadata({
        params: Promise.resolve({ slug: "arena-wien" }),
      });

      expect(meta.title).toContain("Events at Arena Wien");
      expect(meta.description).toContain("Arena Wien");
      expect(meta.alternates?.canonical).toBe(
        "https://www.wienwasgeht.at/venue/arena-wien"
      );
      expect(meta.keywords).toContain("Arena Wien");
    });

    it("should return empty metadata for unknown venue slug", async () => {
      const meta = await generateVenueMetadata({
        params: Promise.resolve({ slug: "non-existent-venue" }),
      });
      expect(meta).toEqual({});
    });
  });

  describe("Time Hubs (/tomorrow and /weekend)", () => {
    it("should configure SEO metadata for '/tomorrow'", () => {
      expect(tomorrowMetadata.title).toContain("Events Tomorrow in Vienna");
      expect(tomorrowMetadata.alternates?.canonical).toBe(
        "https://www.wienwasgeht.at/tomorrow"
      );
      expect(tomorrowMetadata.openGraph?.images).toBeDefined();
    });

    it("should configure SEO metadata for '/weekend'", () => {
      expect(weekendMetadata.title).toContain("Weekend Events in Vienna");
      expect(weekendMetadata.alternates?.canonical).toBe(
        "https://www.wienwasgeht.at/weekend"
      );
      expect(weekendMetadata.openGraph?.images).toBeDefined();
    });
  });
});
