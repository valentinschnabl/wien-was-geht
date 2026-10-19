import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  CATEGORY_TO_SLUG,
  SLUG_TO_CATEGORY,
  CATEGORIES_CONFIG,
  LOCATIONS_CONFIG,
  safeIsoDate,
  generateEventJsonLd,
  getInitialEvents,
  siteUrl,
} from "./events";
import type { EventRecord } from "@/components/MapView";

describe("events.ts — Category and Venue Hubs & Structured Data", () => {
  describe("Category Slug Mappings", () => {
    it("should provide complete bidirectional category-to-slug mappings", () => {
      const expectedCategories = [
        "Nightlife",
        "Music",
        "Culture",
        "Family",
        "Sports",
        "Culinary",
      ];

      for (const cat of expectedCategories) {
        const slug = CATEGORY_TO_SLUG[cat];
        expect(slug).toBeDefined();
        expect(typeof slug).toBe("string");
        expect(SLUG_TO_CATEGORY[slug]).toBe(cat);
      }
    });

    it("should map categories strictly to English slugs", () => {
      expect(CATEGORY_TO_SLUG["Nightlife"]).toBe("nightlife");
      expect(CATEGORY_TO_SLUG["Music"]).toBe("concerts");
      expect(CATEGORY_TO_SLUG["Culture"]).toBe("culture");
      expect(CATEGORY_TO_SLUG["Family"]).toBe("family");
      expect(CATEGORY_TO_SLUG["Sports"]).toBe("sports");
      expect(CATEGORY_TO_SLUG["Culinary"]).toBe("culinary");
    });
  });

  describe("CATEGORIES_CONFIG", () => {
    it("should configure all 7 evergreen category hubs", () => {
      const keys = Object.keys(CATEGORIES_CONFIG);
      expect(keys).toEqual([
        "nightlife",
        "concerts",
        "culture",
        "free",
        "family",
        "sports",
        "culinary",
      ]);
    });

    it("should have complete SEO metadata for every category", () => {
      for (const [slug, config] of Object.entries(CATEGORIES_CONFIG)) {
        expect(config.name).toBeTruthy();
        expect(config.title).toContain("WienWasGeht");
        expect(config.description.length).toBeGreaterThan(30);
        expect(config.keywords.length).toBeGreaterThanOrEqual(3);
        expect(config.heading).toBeTruthy();
        expect(config.introText).toBeTruthy();

        if (slug === "free") {
          expect(config.onlyFree).toBe(true);
        } else {
          expect(config.categoryKey).toBeDefined();
        }
      }
    });
  });

  describe("LOCATIONS_CONFIG", () => {
    it("should configure key Vienna venues with valid search terms", () => {
      const venueSlugs = Object.keys(LOCATIONS_CONFIG);
      expect(venueSlugs).toContain("arena-wien");
      expect(venueSlugs).toContain("flex");
      expect(venueSlugs).toContain("fluc");
      expect(venueSlugs).toContain("pratersauna");
      expect(venueSlugs).toContain("sass");
      expect(venueSlugs).toContain("porgy-bess");
      expect(venueSlugs).toContain("wiener-konzerthaus");

      for (const [, config] of Object.entries(LOCATIONS_CONFIG)) {
        expect(config.name).toBeTruthy();
        expect(config.searchTerm).toBeTruthy();
        expect(config.title).toContain("WienWasGeht");
        expect(config.description).toBeTruthy();
        expect(config.keywords.length).toBeGreaterThanOrEqual(2);
      }
    });
  });

  describe("safeIsoDate", () => {
    it("should return valid ISO string for valid date inputs", () => {
      const iso = "2026-10-19T20:00:00.000Z";
      expect(safeIsoDate(iso)).toBe(iso);

      const parsed = safeIsoDate("2026-10-19 20:00");
      expect(parsed).toBeTruthy();
      expect(parsed).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it("should return null for null, undefined, empty, or invalid dates", () => {
      expect(safeIsoDate(null)).toBeNull();
      expect(safeIsoDate(undefined)).toBeNull();
      expect(safeIsoDate("")).toBeNull();
      expect(safeIsoDate("not-a-date")).toBeNull();
    });
  });

  describe("generateEventJsonLd", () => {
    const mockEvents: EventRecord[] = [
      {
        id: "evt-1",
        title: "Techno Night at Fluc",
        description: "Hard techno underground party",
        category: "Nightlife",
        venueName: "Fluc Wanne",
        latitude: 48.2185,
        longitude: 16.3912,
        startTime: "2026-10-19T23:00:00.000Z",
        endTime: "2026-10-20T06:00:00.000Z",
        isFree: false,
        url: "https://example.com/event-1",
        imageUrl: "https://example.com/image-1.jpg",
      },
      {
        id: "evt-2",
        title: "Free Jazz Session",
        category: "Music",
        venueName: "Porgy & Bess",
        latitude: 48.2062,
        longitude: 16.3752,
        startTime: "2026-10-19T19:00:00.000Z",
        isFree: true,
      },
    ];

    it("should return null for empty event lists or events without startTime", () => {
      expect(generateEventJsonLd([], siteUrl)).toBeNull();
      expect(
        generateEventJsonLd(
          [{ id: "x", title: "No Time", category: "Music" } as EventRecord],
          siteUrl
        )
      ).toBeNull();
    });

    it("should generate a schema.org ItemList with nested Event items", () => {
      const jsonLd = generateEventJsonLd(mockEvents, siteUrl, "Test List", "Test Description");
      expect(jsonLd).not.toBeNull();
      expect(jsonLd?.["@context"]).toBe("https://schema.org");
      expect(jsonLd?.["@type"]).toBe("ItemList");
      expect(jsonLd?.name).toBe("Test List");
      expect(jsonLd?.description).toBe("Test Description");
      expect(jsonLd?.numberOfItems).toBe(2);

      const items = jsonLd?.itemListElement;
      expect(items).toHaveLength(2);

      // First item
      expect(items?.[0]["@type"]).toBe("ListItem");
      expect(items?.[0].position).toBe(1);
      const ev1 = items?.[0].item;
      expect(ev1["@type"]).toBe("Event");
      expect(ev1.name).toBe("Techno Night at Fluc");
      expect(ev1.startDate).toBe("2026-10-19T23:00:00.000Z");
      expect(ev1.endDate).toBe("2026-10-20T06:00:00.000Z");
      expect(ev1.location.name).toBe("Fluc Wanne");
      expect(ev1.location.geo.latitude).toBe(48.2185);
      expect(ev1.location.geo.longitude).toBe(16.3912);
      expect(ev1.offers.url).toBe("https://example.com/event-1");
      expect(ev1.offers.validFrom).toBeTruthy();
      expect(ev1.performer).toBeDefined();
      expect(ev1.performer.name).toBeTruthy();

      // Second item (free event)
      const ev2 = items?.[1].item;
      expect(ev2.name).toBe("Free Jazz Session");
      expect(ev2.offers.price).toBe("0");
      expect(ev2.offers.validFrom).toBeTruthy();
      expect(ev2.image[0]).toContain("og-image.png"); // fallback
    });

    it("should omit geo coordinates if latitude/longitude are zero or missing", () => {
      const eventWithoutCoords: EventRecord[] = [
        {
          id: "evt-no-geo",
          title: "Online / No Location Event",
          startTime: "2026-10-19T18:00:00.000Z",
          latitude: 0,
          longitude: 0,
        },
      ];
      const jsonLd = generateEventJsonLd(eventWithoutCoords, siteUrl);
      const item = jsonLd?.itemListElement[0].item;
      expect(item.location.geo).toBeUndefined();
    });

    it("should cap the ItemList at maximum 50 events", () => {
      const manyEvents: EventRecord[] = Array.from({ length: 75 }, (_, i) => ({
        id: `evt-${i}`,
        title: `Event ${i}`,
        startTime: "2026-10-19T18:00:00.000Z",
      }));
      const jsonLd = generateEventJsonLd(manyEvents, siteUrl);
      expect(jsonLd?.numberOfItems).toBe(50);
      expect(jsonLd?.itemListElement).toHaveLength(50);
    });
  });

  describe("getInitialEvents", () => {
    const originalFetch = global.fetch;

    beforeEach(() => {
      vi.restoreAllMocks();
    });

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it("should return empty array if fetch fails or throws", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Network Error"));
      const events = await getInitialEvents();
      expect(events).toEqual([]);
    });

    it("should return empty array if API responds with non-ok status", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });
      const events = await getInitialEvents();
      expect(events).toEqual([]);
    });

    it("should return data array when API succeeds", async () => {
      const mockData = [{ id: "1", title: "Sample Event" }];
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: mockData }),
      });
      const events = await getInitialEvents();
      expect(events).toEqual(mockData);
    });
  });
});
