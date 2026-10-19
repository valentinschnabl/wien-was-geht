import { CATEGORY_TO_SLUG, SLUG_TO_CATEGORY } from "./events";

export interface BuildUrlOptions {
  currentPath?: string;
  category?: string; // e.g. "Nightlife", "Music", "all"
  onlyFree?: boolean;
  quickFilter?: "all" | "live" | "tomorrow";
  lang?: "de" | "en";
  eventId?: string | null;
}

export interface ParsedUrlFilters {
  category: string;
  onlyFree: boolean;
  quickFilter: "all" | "live" | "tomorrow";
  lang?: "de" | "en";
  eventId?: string | null;
}

/**
 * Computes the canonical SEO hub path and overloaded query parameters
 * based on active filter state.
 */
export function buildOverloadedUrl(options: BuildUrlOptions): string {
  const {
    currentPath = "/",
    category = "all",
    onlyFree = false,
    quickFilter = "all",
    lang = "de",
    eventId = null,
  } = options;

  const isVenuePage = currentPath.startsWith("/venue/");
  const isWeekendPage = currentPath === "/weekend";
  const searchParams = new URLSearchParams();

  // Language parameter
  if (lang === "en") {
    searchParams.set("lang", "en");
  }

  // Event ID parameter
  if (eventId) {
    searchParams.set("event", eventId);
  }

  let targetPath = "/";

  if (isVenuePage) {
    // Retain venue path and overload with category, time, and free params
    targetPath = currentPath;
    if (category !== "all" && CATEGORY_TO_SLUG[category]) {
      searchParams.set("category", CATEGORY_TO_SLUG[category]);
    }
    if (onlyFree) {
      searchParams.set("free", "true");
    }
    if (quickFilter === "tomorrow") {
      searchParams.set("when", "tomorrow");
    } else if (quickFilter === "live") {
      searchParams.set("when", "live");
    }
  } else if (isWeekendPage && quickFilter !== "tomorrow") {
    targetPath = "/weekend";
    if (category !== "all" && CATEGORY_TO_SLUG[category]) {
      searchParams.set("category", CATEGORY_TO_SLUG[category]);
    }
    if (onlyFree) {
      searchParams.set("free", "true");
    }
    if (quickFilter === "live") {
      searchParams.set("when", "live");
    }
  } else {
    // Primary hub selection rules
    if (category !== "all" && CATEGORY_TO_SLUG[category]) {
      targetPath = `/category/${CATEGORY_TO_SLUG[category]}`;
      if (onlyFree) {
        searchParams.set("free", "true");
      }
      if (quickFilter === "tomorrow") {
        searchParams.set("when", "tomorrow");
      } else if (quickFilter === "live") {
        searchParams.set("when", "live");
      }
    } else if (quickFilter === "tomorrow") {
      targetPath = "/tomorrow";
      if (onlyFree) {
        searchParams.set("free", "true");
      }
    } else if (onlyFree) {
      targetPath = "/category/free";
      if (quickFilter === "live") {
        searchParams.set("when", "live");
      }
    } else {
      targetPath = "/";
      if (quickFilter === "live") {
        searchParams.set("when", "live");
      }
    }
  }

  const queryStr = searchParams.toString();
  return queryStr ? `${targetPath}?${queryStr}` : targetPath;
}

/**
 * Parses pathname and query parameters into internal filter states.
 * Used on popstate and initial direct URL load.
 */
export function parseUrlFilters(
  pathname: string,
  search: string | URLSearchParams
): ParsedUrlFilters {
  const searchParams =
    typeof search === "string" ? new URLSearchParams(search) : search;

  let category = "all";
  let onlyFree = false;
  let quickFilter: "all" | "live" | "tomorrow" = "all";

  // Query parameters first
  const whenParam = searchParams.get("when");
  if (whenParam === "tomorrow") {
    quickFilter = "tomorrow";
  } else if (whenParam === "live") {
    quickFilter = "live";
  }

  if (searchParams.get("free") === "true") {
    onlyFree = true;
  }

  const categoryParam = searchParams.get("category");
  if (categoryParam && SLUG_TO_CATEGORY[categoryParam]) {
    category = SLUG_TO_CATEGORY[categoryParam];
  }

  // Pathname defaults / overrides
  if (pathname === "/tomorrow") {
    quickFilter = "tomorrow";
  } else if (pathname === "/category/free") {
    onlyFree = true;
  } else if (pathname.startsWith("/category/")) {
    const slug = pathname.replace("/category/", "").replace(/\/$/, "");
    if (slug === "free") {
      onlyFree = true;
    } else if (SLUG_TO_CATEGORY[slug]) {
      category = SLUG_TO_CATEGORY[slug];
    }
  }

  const langParam = searchParams.get("lang");
  const lang: "de" | "en" | undefined =
    langParam === "en" ? "en" : langParam === "de" ? "de" : undefined;

  const eventId = searchParams.get("event") || null;

  return {
    category,
    onlyFree,
    quickFilter,
    lang,
    eventId,
  };
}
