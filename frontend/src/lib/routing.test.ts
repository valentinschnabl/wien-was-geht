import { describe, it, expect } from "vitest";
import { buildOverloadedUrl, parseUrlFilters } from "./routing";

describe("Routing & Dynamic URL Parameter Overloading", () => {
  describe("buildOverloadedUrl", () => {
    it("should return root '/' when all filters are in default state", () => {
      const url = buildOverloadedUrl({
        category: "all",
        onlyFree: false,
        quickFilter: "all",
      });
      expect(url).toBe("/");
    });

    it("should construct single category URLs with English slugs", () => {
      expect(buildOverloadedUrl({ category: "Nightlife" })).toBe("/category/nightlife");
      expect(buildOverloadedUrl({ category: "Music" })).toBe("/category/concerts");
      expect(buildOverloadedUrl({ category: "Culture" })).toBe("/category/culture");
      expect(buildOverloadedUrl({ category: "Family" })).toBe("/category/family");
      expect(buildOverloadedUrl({ category: "Sports" })).toBe("/category/sports");
      expect(buildOverloadedUrl({ category: "Culinary" })).toBe("/category/culinary");
    });

    it("should overload category with 'when=tomorrow' when Tomorrow is selected", () => {
      const url = buildOverloadedUrl({
        category: "Nightlife",
        quickFilter: "tomorrow",
      });
      expect(url).toBe("/category/nightlife?when=tomorrow");
    });

    it("should overload category with 'when=live' when Live is selected", () => {
      const url = buildOverloadedUrl({
        category: "Music",
        quickFilter: "live",
      });
      expect(url).toBe("/category/concerts?when=live");
    });

    it("should overload category with 'free=true' when Free admission is selected", () => {
      const url = buildOverloadedUrl({
        category: "Culture",
        onlyFree: true,
      });
      expect(url).toBe("/category/culture?free=true");
    });

    it("should overload category with both 'when=tomorrow' and 'free=true'", () => {
      const url = buildOverloadedUrl({
        category: "Nightlife",
        quickFilter: "tomorrow",
        onlyFree: true,
      });
      expect(url).toBe("/category/nightlife?free=true&when=tomorrow");
    });

    it("should route to standalone '/tomorrow' when only Tomorrow is active", () => {
      const url = buildOverloadedUrl({
        category: "all",
        quickFilter: "tomorrow",
        onlyFree: false,
      });
      expect(url).toBe("/tomorrow");
    });

    it("should overload '/tomorrow' with 'free=true' when Tomorrow and Free are both active", () => {
      const url = buildOverloadedUrl({
        category: "all",
        quickFilter: "tomorrow",
        onlyFree: true,
      });
      expect(url).toBe("/tomorrow?free=true");
    });

    it("should route to standalone '/category/free' when only Free admission is active today", () => {
      const url = buildOverloadedUrl({
        category: "all",
        quickFilter: "all",
        onlyFree: true,
      });
      expect(url).toBe("/category/free");
    });

    it("should overload '/category/free' with 'when=live' when Live and Free are active", () => {
      const url = buildOverloadedUrl({
        category: "all",
        quickFilter: "live",
        onlyFree: true,
      });
      expect(url).toBe("/category/free?when=live");
    });

    it("should route to '/?when=live' when only Live is active on home", () => {
      const url = buildOverloadedUrl({
        category: "all",
        quickFilter: "live",
        onlyFree: false,
      });
      expect(url).toBe("/?when=live");
    });

    it("should preserve venue path and overload all active filters as query params", () => {
      const url = buildOverloadedUrl({
        currentPath: "/venue/arena-wien",
        category: "Music",
        quickFilter: "tomorrow",
        onlyFree: true,
      });
      expect(url).toBe("/venue/arena-wien?category=concerts&free=true&when=tomorrow");
    });

    it("should preserve weekend path and overload category and free", () => {
      const url = buildOverloadedUrl({
        currentPath: "/weekend",
        category: "Nightlife",
        onlyFree: true,
      });
      expect(url).toBe("/weekend?category=nightlife&free=true");
    });

    it("should preserve English language parameter '?lang=en'", () => {
      const url = buildOverloadedUrl({
        category: "Nightlife",
        quickFilter: "tomorrow",
        onlyFree: true,
        lang: "en",
      });
      expect(url).toBe("/category/nightlife?lang=en&free=true&when=tomorrow");
    });

    it("should include event ID parameter '?event=<id>' when provided", () => {
      const url = buildOverloadedUrl({
        category: "Culture",
        eventId: "event-xyz-789",
      });
      expect(url).toBe("/category/culture?event=event-xyz-789");
    });
  });

  describe("parseUrlFilters", () => {
    it("should parse default root URL '/' into all-default state", () => {
      const parsed = parseUrlFilters("/", "");
      expect(parsed).toEqual({
        category: "all",
        onlyFree: false,
        quickFilter: "all",
        lang: undefined,
        eventId: null,
      });
    });

    it("should parse '/tomorrow' path into quickFilter 'tomorrow'", () => {
      const parsed = parseUrlFilters("/tomorrow", "");
      expect(parsed.quickFilter).toBe("tomorrow");
      expect(parsed.category).toBe("all");
      expect(parsed.onlyFree).toBe(false);
    });

    it("should parse '/category/free' into onlyFree true", () => {
      const parsed = parseUrlFilters("/category/free", "");
      expect(parsed.onlyFree).toBe(true);
      expect(parsed.category).toBe("all");
    });

    it("should parse English category paths into internal category names", () => {
      expect(parseUrlFilters("/category/nightlife", "").category).toBe("Nightlife");
      expect(parseUrlFilters("/category/concerts", "").category).toBe("Music");
      expect(parseUrlFilters("/category/culture", "").category).toBe("Culture");
      expect(parseUrlFilters("/category/family", "").category).toBe("Family");
      expect(parseUrlFilters("/category/sports", "").category).toBe("Sports");
      expect(parseUrlFilters("/category/culinary", "").category).toBe("Culinary");
    });

    it("should parse overloaded query parameters correctly", () => {
      const parsed = parseUrlFilters("/category/nightlife", "?when=tomorrow&free=true&lang=en&event=ev123");
      expect(parsed).toEqual({
        category: "Nightlife",
        onlyFree: true,
        quickFilter: "tomorrow",
        lang: "en",
        eventId: "ev123",
      });
    });

    it("should parse venue page with overloaded filters", () => {
      const parsed = parseUrlFilters(
        "/venue/arena-wien",
        "?category=concerts&when=tomorrow&free=true"
      );
      expect(parsed).toEqual({
        category: "Music",
        onlyFree: true,
        quickFilter: "tomorrow",
        lang: undefined,
        eventId: null,
      });
    });

    it("should parse '/tomorrow?free=true' correctly", () => {
      const parsed = parseUrlFilters("/tomorrow", "?free=true");
      expect(parsed.quickFilter).toBe("tomorrow");
      expect(parsed.onlyFree).toBe(true);
      expect(parsed.category).toBe("all");
    });

    it("should maintain bidirectional roundtrip parity for complex overloaded URLs", () => {
      const originalOptions = {
        category: "Music",
        onlyFree: true,
        quickFilter: "tomorrow" as const,
        lang: "en" as const,
        eventId: "test-id",
      };

      const builtUrl = buildOverloadedUrl(originalOptions);
      const [pathname, search] = builtUrl.split("?");
      const parsed = parseUrlFilters(pathname, `?${search}`);

      expect(parsed.category).toBe(originalOptions.category);
      expect(parsed.onlyFree).toBe(originalOptions.onlyFree);
      expect(parsed.quickFilter).toBe(originalOptions.quickFilter);
      expect(parsed.lang).toBe(originalOptions.lang);
      expect(parsed.eventId).toBe(originalOptions.eventId);
    });
  });
});
