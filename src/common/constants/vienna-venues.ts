/**
 * Centralized, fast in-memory coordinate lookup for prominent Vienna concert halls,
 * cultural centers, indie venues, clubs, and open-air locations.
 * Memory footprint: ~5 KB. Resolves coordinates in 0 ms without external network overhead.
 */
export interface Coordinates {
  lat: number;
  lng: number;
}

export const VIENNA_VENUES: Record<string, Coordinates> = {
  // Underground, Indie & Live Music Venues
  'arena': { lat: 48.1883, lng: 16.4136 },
  'arena wien': { lat: 48.1883, lng: 16.4136 },
  'arena-beisl': { lat: 48.1883, lng: 16.4136 },
  'arena open air': { lat: 48.1883, lng: 16.4136 },
  'flex': { lat: 48.2185, lng: 16.3705 },
  'flex cafe': { lat: 48.2185, lng: 16.3705 },
  'wuk': { lat: 48.2229, lng: 16.3508 },
  'wuk hof': { lat: 48.2229, lng: 16.3508 },
  'wuk halle': { lat: 48.2229, lng: 16.3508 },
  'chelsea': { lat: 48.2155, lng: 16.3425 },
  'b72': { lat: 48.2175, lng: 16.3455 },
  'kramladen': { lat: 48.2188, lng: 16.3468 },
  'rhiz': { lat: 48.2162, lng: 16.3435 },
  'loop': { lat: 48.2182, lng: 16.3462 },
  'viper room': { lat: 48.1963, lng: 16.3985 },
  'venster': { lat: 48.2212, lng: 16.3485 },
  'venster99': { lat: 48.2212, lng: 16.3485 },
  'the loft': { lat: 48.2133, lng: 16.3401 },
  'loft': { lat: 48.2133, lng: 16.3401 },
  'cafe carina': { lat: 48.2144, lng: 16.3412 },
  'café carina': { lat: 48.2144, lng: 16.3412 },
  'escape': { lat: 48.2092, lng: 16.3495 },
  'escape metalcorner': { lat: 48.2092, lng: 16.3495 },
  'metastadt': { lat: 48.2172, lng: 16.4678 },
  'kaorle': { lat: 48.1798, lng: 16.3685 },
  'kaorle owa': { lat: 48.1798, lng: 16.3685 },
  'schlor': { lat: 48.1652, lng: 16.4102 },
  'schlor wien': { lat: 48.1652, lng: 16.4102 },
  'sissysound': { lat: 48.2045, lng: 16.3521 },
  'bootleg': { lat: 48.2192, lng: 16.3472 },
  'the chamber': { lat: 48.2062, lng: 16.3612 },
  'lucia': { lat: 48.2148, lng: 16.3418 },
  'club lucia': { lat: 48.2148, lng: 16.3418 },
  'szene wien': { lat: 48.1782, lng: 16.4172 },
  'szene': { lat: 48.1782, lng: 16.4172 },
  'badeschiff': { lat: 48.2118, lng: 16.3816 },
  'couch potato': { lat: 48.2403, lng: 16.3852 },
  
  // Electronic, Club & Nightlife Venues
  'fluc': { lat: 48.2173, lng: 16.3905 },
  'fluc wanne': { lat: 48.2173, lng: 16.3905 },
  'das werk': { lat: 48.2346, lng: 16.3582 },
  'werk': { lat: 48.2346, lng: 16.3582 },
  'grelle forelle': { lat: 48.2355, lng: 16.3575 },
  'pratersauna': { lat: 48.2132, lng: 16.4024 },
  'prst': { lat: 48.2195, lng: 16.3945 },
  'praterstrasse': { lat: 48.2195, lng: 16.3945 },
  'sass': { lat: 48.2007, lng: 16.3688 },
  'sass music club': { lat: 48.2007, lng: 16.3688 },
  'volksgarten': { lat: 48.2065, lng: 16.3615 },
  'volksgarten pavillon': { lat: 48.2070, lng: 16.3616 },
  'hermannpark': { lat: 48.2120, lng: 16.3840 },
  'o der klub': { lat: 48.2025, lng: 16.3685 },
  'celeste': { lat: 48.1965, lng: 16.3602 },
  'donau techno': { lat: 48.2012, lng: 16.3545 },
  'camera club': { lat: 48.1982, lng: 16.3524 },
  'club u': { lat: 48.2005, lng: 16.3695 },
  'ponyhof': { lat: 48.1988, lng: 16.3512 },
  'babylon': { lat: 48.2152, lng: 16.3421 },
  'u4': { lat: 48.1848, lng: 16.3292 },
  'cabaret fledermaus': { lat: 48.2075, lng: 16.3705 },
  'fledermaus': { lat: 48.2075, lng: 16.3705 },
  'tanzcafé jenseits': { lat: 48.1983, lng: 16.3533 },
  'tanzcafe jenseits': { lat: 48.1983, lng: 16.3533 },
  'jenseits': { lat: 48.1983, lng: 16.3533 },
  'vie i pee': { lat: 48.2125, lng: 16.4022 },
  'vieipee': { lat: 48.2125, lng: 16.4022 },
  'o - der klub': { lat: 48.2023, lng: 16.3688 },
  'o – der klub': { lat: 48.2023, lng: 16.3688 },
  'volksgarten disco': { lat: 48.2069, lng: 16.3625 },
  'bricks': { lat: 48.2178, lng: 16.3811 },
  'weberknecht': { lat: 48.2117, lng: 16.3403 },
  'jazzland': { lat: 48.2128, lng: 16.3744 },
  'zwe': { lat: 48.2183, lng: 16.3755 },
  'heuriger zum martin sepp': { lat: 48.2561, lng: 16.3256 },
  'zum martin sepp': { lat: 48.2561, lng: 16.3256 },
  'martin sepp': { lat: 48.2561, lng: 16.3256 },
  'vcbc': { lat: 48.2325, lng: 16.4445 },
  'vienna city beach club': { lat: 48.2325, lng: 16.4445 },
  'strandbar herrmann': { lat: 48.2120, lng: 16.3840 },
  'wiener würstelstand': { lat: 48.2347, lng: 16.3578 },
  'wiener wuerstelstand': { lat: 48.2347, lng: 16.3578 },
  'theater im park': { lat: 48.1969, lng: 16.3778 },
  'café concerto': { lat: 48.2122, lng: 16.3400 },
  'cafe concerto': { lat: 48.2122, lng: 16.3400 },
  'frau mayer': { lat: 48.2114, lng: 16.3758 },
  'tudo bem': { lat: 48.1917, lng: 16.3705 },
  'louisiana blues pub': { lat: 48.1908, lng: 16.3750 },
  'zoku': { lat: 48.2172, lng: 16.4021 },
  'zoku vienna': { lat: 48.2172, lng: 16.4021 },
  'the popp': { lat: 48.2149, lng: 16.4029 },
  'ototo store': { lat: 48.2155, lng: 16.3839 },
  'exil': { lat: 48.1932, lng: 16.4012 },
  'exil club': { lat: 48.1932, lng: 16.4012 },
  'prater dome': { lat: 48.2168, lng: 16.3975 },
  'babenberger passage': { lat: 48.2045, lng: 16.3638 },
  'passage': { lat: 48.2045, lng: 16.3638 },
  'usus am wasser': { lat: 48.2415, lng: 16.4278 },
  'usus': { lat: 48.2415, lng: 16.4278 },
  'schikaneder': { lat: 48.1965, lng: 16.3635 },

  // Large Concert Halls & Arenas
  'gasometer': { lat: 48.1852, lng: 16.4208 },
  'planet.tt': { lat: 48.1852, lng: 16.4208 },
  'stadthalle': { lat: 48.2019, lng: 16.3376 },
  'wiener stadthalle': { lat: 48.2019, lng: 16.3376 },
  'stadthalle d': { lat: 48.2019, lng: 16.3376 },
  'stadthalle f': { lat: 48.2019, lng: 16.3376 },
  'ernst happel stadion': { lat: 48.2072, lng: 16.4211 },
  'happel stadion': { lat: 48.2072, lng: 16.4211 },

  // Classical, Theatres & Culture
  'porgy & bess': { lat: 48.2052, lng: 16.3742 },
  'porgy and bess': { lat: 48.2052, lng: 16.3742 },
  'konzerthaus': { lat: 48.2008, lng: 16.3772 },
  'wiener konzerthaus': { lat: 48.2008, lng: 16.3772 },
  'musikverein': { lat: 48.2012, lng: 16.3725 },
  'goldener saal': { lat: 48.2012, lng: 16.3725 },
  'staatsoper': { lat: 48.2030, lng: 16.3691 },
  'wiener staatsoper': { lat: 48.2030, lng: 16.3691 },
  'volksoper': { lat: 48.2248, lng: 16.3502 },
  'volkstheater': { lat: 48.2051, lng: 16.3567 },
  'burgtheater': { lat: 48.2103, lng: 16.3614 },
  'akademietheater': { lat: 48.2001, lng: 16.3765 },
  'theater an der wien': { lat: 48.1995, lng: 16.3642 },
  'museumsquartier': { lat: 48.2035, lng: 16.3582 },
  'mq': { lat: 48.2035, lng: 16.3582 },
  'halle e': { lat: 48.2035, lng: 16.3582 },
  'halle g': { lat: 48.2035, lng: 16.3582 },
  'mumok': { lat: 48.2032, lng: 16.3585 },
  'leopold museum': { lat: 48.2028, lng: 16.3592 },
  'belvedere': { lat: 48.1915, lng: 16.3808 },
  'albertina': { lat: 48.2045, lng: 16.3678 },
  'architekturzentrum wien': { lat: 48.2038, lng: 16.3588 },
  'az w': { lat: 48.2038, lng: 16.3588 },

  // Recurring Parks & Public Spaces
  'reithofferpark': { lat: 48.1957, lng: 16.3282 },
  'reiterhoffpark': { lat: 48.1957, lng: 16.3282 },
  'reithofferplatz': { lat: 48.1957, lng: 16.3282 },
  'donaupark': { lat: 48.2415, lng: 16.4172 },
  'bühne im donaupark': { lat: 48.2415, lng: 16.4172 },
  'otto wagner areal': { lat: 48.2095, lng: 16.2792 },
  'baumgartner höhe': { lat: 48.2095, lng: 16.2792 },
  'schrödingerplatz': { lat: 48.2385, lng: 16.4295 },
  'schroedingerplatz': { lat: 48.2385, lng: 16.4295 },
  'nordwestbahnhof': { lat: 48.2312, lng: 16.3752 },
  'donauinsel': { lat: 48.2266, lng: 16.4122 },
  'rathausplatz': { lat: 48.2108, lng: 16.3575 },
  'karlsplatz': { lat: 48.2002, lng: 16.3702 },
  'sigmund-freud-park': { lat: 48.2155, lng: 16.3595 },
  'augarten': { lat: 48.2255, lng: 16.3782 },
  'hyblerpark': { lat: 48.1755, lng: 16.4182 },
  'wilhelmsdorfer park': { lat: 48.1812, lng: 16.3365 },
  'waldmüllerpark': { lat: 48.1798, lng: 16.3685 },
  'waldmuellerpark': { lat: 48.1798, lng: 16.3685 },
  'kongreßpark': { lat: 48.2148, lng: 16.3115 },
  'kongresspark': { lat: 48.2148, lng: 16.3115 },
  'fußballverein 1210 wien': { lat: 48.2785, lng: 16.4025 },
  'fussballverein 1210 wien': { lat: 48.2785, lng: 16.4025 },
  '1210 wien': { lat: 48.2785, lng: 16.4025 },
};

// Pre-sorted venue entries (longest key first) for precise fuzzy matching
const SORTED_VENUE_ENTRIES = Object.entries(VIENNA_VENUES).sort(
  (a, b) => b[0].length - a[0].length,
);

/**
 * Fast string normalization for fuzzy venue matching
 */
export function resolveViennaVenueCoordinates(
  venueNameOrAddress?: string | null,
): Coordinates | null {
  if (!venueNameOrAddress) return null;

  const normalized = venueNameOrAddress
    .toLowerCase()
    .replace(/[,\.\-\/\\()"„“»«']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalized) return null;

  // 1. Direct key match
  if (VIENNA_VENUES[normalized]) {
    return VIENNA_VENUES[normalized];
  }

  // 2. Whole-word substring matching, longest specific venue key first
  for (const [venueKey, coords] of SORTED_VENUE_ENTRIES) {
    const escapedKey = venueKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(^|\\s)${escapedKey}(\\s|$)`, 'i');
    if (regex.test(normalized)) {
      return coords;
    }
  }

  return null;
}
