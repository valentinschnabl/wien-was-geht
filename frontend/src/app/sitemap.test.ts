import { describe, it, expect } from "vitest";
import sitemap from "./sitemap";
import { CATEGORIES_CONFIG, LOCATIONS_CONFIG } from "@/lib/events";

describe("sitemap.ts — XML Sitemap Generation", () => {
  it("should generate all 22 required canonical URLs in English", () => {
    const entries = sitemap();
    const expectedCount =
      4 + Object.keys(CATEGORIES_CONFIG).length + Object.keys(LOCATIONS_CONFIG).length; // 4 root/time + 7 categories + 11 venues = 22

    expect(entries).toHaveLength(expectedCount);
  });

  it("should include root URL with canonical www prefix and language alternates", () => {
    const entries = sitemap();
    const root = entries.find((e) => e.url === "https://www.wienwasgeht.at");

    expect(root).toBeDefined();
    expect(root?.priority).toBe(1.0);
    expect(root?.changeFrequency).toBe("hourly");
    expect(root?.alternates).toEqual({
      languages: {
        "de-AT": "https://www.wienwasgeht.at",
        "en-US": "https://www.wienwasgeht.at/?lang=en",
        "x-default": "https://www.wienwasgeht.at",
      },
    });
  });

  it("should include English root '/?lang=en'", () => {
    const entries = sitemap();
    const enRoot = entries.find((e) => e.url === "https://www.wienwasgeht.at/?lang=en");

    expect(enRoot).toBeDefined();
    expect(enRoot?.changeFrequency).toBe("hourly");
    expect(enRoot?.priority).toBe(0.8);
  });

  it("should include time hubs '/tomorrow' and '/weekend'", () => {
    const entries = sitemap();
    const tomorrow = entries.find((e) => e.url === "https://www.wienwasgeht.at/tomorrow");
    const weekend = entries.find((e) => e.url === "https://www.wienwasgeht.at/weekend");

    expect(tomorrow).toBeDefined();
    expect(tomorrow?.changeFrequency).toBe("daily");
    expect(tomorrow?.priority).toBe(0.9);

    expect(weekend).toBeDefined();
    expect(weekend?.changeFrequency).toBe("daily");
    expect(weekend?.priority).toBe(0.9);
  });

  it("should include all 7 English category hub URLs with 0.9 priority", () => {
    const entries = sitemap();
    for (const slug of Object.keys(CATEGORIES_CONFIG)) {
      const match = entries.find(
        (e) => e.url === `https://www.wienwasgeht.at/category/${slug}`
      );
      expect(match).toBeDefined();
      expect(match?.changeFrequency).toBe("daily");
      expect(match?.priority).toBe(0.9);
    }
  });

  it("should include all 11 English venue hub URLs with 0.8 priority", () => {
    const entries = sitemap();
    for (const slug of Object.keys(LOCATIONS_CONFIG)) {
      const match = entries.find(
        (e) => e.url === `https://www.wienwasgeht.at/venue/${slug}`
      );
      expect(match).toBeDefined();
      expect(match?.changeFrequency).toBe("daily");
      expect(match?.priority).toBe(0.8);
    }
  });
});
