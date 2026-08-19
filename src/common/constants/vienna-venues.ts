/**
 * Centralized, fast in-memory coordinate lookup for prominent Vienna concert halls,
 * cultural centers, indie venues, clubs, markets, museums, parks, and open-air locations.
 * Memory footprint: ~8 KB. Resolves coordinates in 0 ms without external network overhead.
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
  'porgy & bess': { lat: 48.2052, lng: 16.3742 },
  'porgy and bess': { lat: 48.2052, lng: 16.3742 },
  'jazzland': { lat: 48.2128, lng: 16.3744 },
  'zwe': { lat: 48.2183, lng: 16.3755 },
  'frau mayer': { lat: 48.2114, lng: 16.3758 },
  
  // Electronic, Club & Nightlife Venues
  'fluc': { lat: 48.2173, lng: 16.3905 },
  'flucc': { lat: 48.2173, lng: 16.3905 },
  'fluc wanne': { lat: 48.2173, lng: 16.3905 },
  'das werk': { lat: 48.2346, lng: 16.3582 },
  'werk': { lat: 48.2346, lng: 16.3582 },
  'grelle forelle': { lat: 48.2355, lng: 16.3575 },
  'pratersauna': { lat: 48.2132, lng: 16.4024 },
  'prst': { lat: 48.2195, lng: 16.3945 },
  'praterstrasse': { lat: 48.2195, lng: 16.3945 },
  'praterstraße': { lat: 48.2195, lng: 16.3945 },
  'sass': { lat: 48.2007, lng: 16.3688 },
  'sass music club': { lat: 48.2007, lng: 16.3688 },
  'volksgarten': { lat: 48.2065, lng: 16.3615 },
  'volksgarten pavillon': { lat: 48.2070, lng: 16.3616 },
  'volksgarten disco': { lat: 48.2069, lng: 16.3625 },
  'o der klub': { lat: 48.2023, lng: 16.3688 },
  'o - der klub': { lat: 48.2023, lng: 16.3688 },
  'o – der klub': { lat: 48.2023, lng: 16.3688 },
  'celeste': { lat: 48.1965, lng: 16.3602 },
  'donau techno': { lat: 48.2012, lng: 16.3545 },
  'donautechno': { lat: 48.2012, lng: 16.3545 },
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
  'bricks': { lat: 48.2178, lng: 16.3811 },
  'weberknecht': { lat: 48.2117, lng: 16.3403 },
  'heuriger zum martin sepp': { lat: 48.2561, lng: 16.3256 },
  'zum martin sepp': { lat: 48.2561, lng: 16.3256 },
  'martin sepp': { lat: 48.2561, lng: 16.3256 },
  'vcbc': { lat: 48.2325, lng: 16.4445 },
  'vienna city beach club': { lat: 48.2325, lng: 16.4445 },
  'strandbar herrmann': { lat: 48.2120, lng: 16.3840 },
  'hermannpark': { lat: 48.2120, lng: 16.3840 },
  'theater im park': { lat: 48.1969, lng: 16.3778 },
  'café concerto': { lat: 48.2122, lng: 16.3400 },
  'cafe concerto': { lat: 48.2122, lng: 16.3400 },
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
  'mariatrink': { lat: 48.1979, lng: 16.3533 },
  'jaz in the city': { lat: 48.1979, lng: 16.3533 },
  'villa vida': { lat: 48.1950, lng: 16.3562 },
  'ottakringer brauerei': { lat: 48.2133, lng: 16.3242 },
  'ottakringer pl': { lat: 48.2133, lng: 16.3242 },
  'ottakringer platz': { lat: 48.2133, lng: 16.3242 },
  'zukunftshof': { lat: 48.1438, lng: 16.3888 },
  'rosiwalgasse': { lat: 48.1438, lng: 16.3888 },
  'neustift am walde': { lat: 48.2514, lng: 16.3015 },
  'palais auersperg': { lat: 48.2076, lng: 16.3548 },
  'palais freiluft': { lat: 48.2076, lng: 16.3548 },

  // Vienna Markets (Wiener Märkte)
  'naschmarkt': { lat: 48.1985, lng: 16.3635 },
  'karmelitermarkt': { lat: 48.2167, lng: 16.3768 },
  'brunnenmarkt': { lat: 48.2138, lng: 16.3355 },
  'yppenplatz': { lat: 48.2148, lng: 16.3365 },
  'volkertmarkt': { lat: 48.2235, lng: 16.3812 },
  'meiselmarkt': { lat: 48.1985, lng: 16.3155 },
  'viktor-adler-markt': { lat: 48.1755, lng: 16.3775 },
  'viktor adler markt': { lat: 48.1755, lng: 16.3775 },
  'kutschkermarkt': { lat: 48.2268, lng: 16.3475 },
  'hannovermarkt': { lat: 48.2325, lng: 16.3685 },
  'vorgartenmarkt': { lat: 48.2255, lng: 16.4035 },

  // Museums, Sights & Culture
  'kunsthistorisches museum': { lat: 48.2038, lng: 16.3618 },
  'khm': { lat: 48.2038, lng: 16.3618 },
  'naturhistorisches museum': { lat: 48.2052, lng: 16.3598 },
  'nhm': { lat: 48.2052, lng: 16.3598 },
  'haus der geschichte österreich': { lat: 48.2052, lng: 16.3644 },
  'haus der geschichte oesterreich': { lat: 48.2052, lng: 16.3644 },
  'hdgö': { lat: 48.2052, lng: 16.3644 },
  'hdgoe': { lat: 48.2052, lng: 16.3644 },
  'neue hofburg': { lat: 48.2052, lng: 16.3644 },
  'heldenplatz': { lat: 48.2062, lng: 16.3635 },
  'hofburg': { lat: 48.2065, lng: 16.3655 },
  'kunsthauswien': { lat: 48.2114, lng: 16.3932 },
  'kunsthaus wien': { lat: 48.2114, lng: 16.3932 },
  'museum hundertwasser': { lat: 48.2114, lng: 16.3932 },
  'hundertwasser': { lat: 48.2114, lng: 16.3932 },
  'museumsquartier': { lat: 48.2035, lng: 16.3582 },
  'mq': { lat: 48.2035, lng: 16.3582 },
  'kunsthalle wien': { lat: 48.2035, lng: 16.3582 },
  'kunsthalle': { lat: 48.2035, lng: 16.3582 },
  'halle e': { lat: 48.2035, lng: 16.3582 },
  'halle g': { lat: 48.2035, lng: 16.3582 },
  'mumok': { lat: 48.2032, lng: 16.3585 },
  'leopold museum': { lat: 48.2028, lng: 16.3592 },
  'architekturzentrum wien': { lat: 48.2038, lng: 16.3588 },
  'az w': { lat: 48.2038, lng: 16.3588 },
  'mak': { lat: 48.2075, lng: 16.3815 },
  'museum für angewandte kunst': { lat: 48.2075, lng: 16.3815 },
  'albertina': { lat: 48.2045, lng: 16.3678 },
  'albertina modern': { lat: 48.2008, lng: 16.3708 },
  'belvedere': { lat: 48.1915, lng: 16.3808 },
  'oberes belvedere': { lat: 48.1915, lng: 16.3808 },
  'unteres belvedere': { lat: 48.1975, lng: 16.3805 },
  'belvedere 21': { lat: 48.1865, lng: 16.3835 },
  'secession': { lat: 48.2005, lng: 16.3655 },
  'wiener secession': { lat: 48.2005, lng: 16.3655 },
  'wien museum': { lat: 48.1995, lng: 16.3725 },
  'technisches museum': { lat: 48.1908, lng: 16.3185 },
  'heeresgeschichtliches museum': { lat: 48.1855, lng: 16.3875 },
  'hgm': { lat: 48.1855, lng: 16.3875 },
  'jüdisches museum wien': { lat: 48.2068, lng: 16.3702 },
  'juedisches museum': { lat: 48.2068, lng: 16.3702 },
  'mozarthaus': { lat: 48.2085, lng: 16.3752 },
  'haus der musik': { lat: 48.2040, lng: 16.3732 },
  'schloss schönbrunn': { lat: 48.1858, lng: 16.3128 },
  'schönbrunn': { lat: 48.1858, lng: 16.3128 },
  'schoenbrunn': { lat: 48.1858, lng: 16.3128 },
  'nationalbibliothek': { lat: 48.2062, lng: 16.3665 },
  'österreichische nationalbibliothek': { lat: 48.2062, lng: 16.3665 },
  'oesterreichische nationalbibliothek': { lat: 48.2062, lng: 16.3665 },
  'önb': { lat: 48.2062, lng: 16.3665 },
  'oenb': { lat: 48.2062, lng: 16.3665 },
  'prunksaal': { lat: 48.2062, lng: 16.3665 },
  'prunksaal der nationalbibliothek': { lat: 48.2062, lng: 16.3665 },

  // Cinemas & Film Festivals (Kinos & Filmfestivals)
  'filmcasino': { lat: 48.1925, lng: 16.3589 },
  'film casino': { lat: 48.1925, lng: 16.3589 },
  'gartenbaukino': { lat: 48.2058, lng: 16.3785 },
  'stadtkino': { lat: 48.2008, lng: 16.3688 },
  'votivkino': { lat: 48.2162, lng: 16.3598 },
  'votiv kino': { lat: 48.2162, lng: 16.3598 },
  'kino de france': { lat: 48.2152, lng: 16.3638 },
  'de france': { lat: 48.2152, lng: 16.3638 },
  'burg kino': { lat: 48.2038, lng: 16.3665 },
  'top kino': { lat: 48.1985, lng: 16.3605 },
  'breitenseer lichtspiele': { lat: 48.1988, lng: 16.3075 },
  'admiral kino': { lat: 48.2025, lng: 16.3485 },
  'bellaria kino': { lat: 48.2055, lng: 16.3565 },
  'volxkino': { lat: 48.1872, lng: 16.3486 },
  'filmfestival': { lat: 48.2108, lng: 16.3575 },
  'film festival': { lat: 48.2108, lng: 16.3575 },
  'filmfestival rathausplatz': { lat: 48.2108, lng: 16.3575 },
  'film festival rathausplatz': { lat: 48.2108, lng: 16.3575 },
  'filmfestival auf dem wiener rathausplatz': { lat: 48.2108, lng: 16.3575 },

  // Large Concert Halls & Arenas
  'gasometer': { lat: 48.1852, lng: 16.4208 },
  'planet.tt': { lat: 48.1852, lng: 16.4208 },
  'stadthalle': { lat: 48.2019, lng: 16.3376 },
  'wiener stadthalle': { lat: 48.2019, lng: 16.3376 },
  'stadthalle d': { lat: 48.2019, lng: 16.3376 },
  'stadthalle f': { lat: 48.2019, lng: 16.3376 },
  'ernst happel stadion': { lat: 48.2072, lng: 16.4211 },
  'happel stadion': { lat: 48.2072, lng: 16.4211 },
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
  'stephansdom': { lat: 48.2085, lng: 16.3732 },
  'wiener stephansdom': { lat: 48.2085, lng: 16.3732 },

  // Parks, Squares & Outdoor Spaces
  'bruno-kreisky-park': { lat: 48.1872, lng: 16.3486 },
  'bruno kreisky park': { lat: 48.1872, lng: 16.3486 },
  'bruno kreisky platz': { lat: 48.1872, lng: 16.3486 },
  'votivpark': { lat: 48.2155, lng: 16.3592 },
  'türkenschanzpark': { lat: 48.2353, lng: 16.3331 },
  'türkenschanz park': { lat: 48.2353, lng: 16.3331 },
  'tuerkenschanzpark': { lat: 48.2353, lng: 16.3331 },
  'jesuitenwiese': { lat: 48.2081, lng: 16.4024 },
  'jesuitenwiese prater': { lat: 48.2081, lng: 16.4024 },
  'kirschblütenpark': { lat: 48.2386, lng: 16.4422 },
  'kirschbluetenpark': { lat: 48.2386, lng: 16.4422 },
  'stadtpark': { lat: 48.2038, lng: 16.3795 },
  'burggarten': { lat: 48.2045, lng: 16.3662 },
  'prater': { lat: 48.2165, lng: 16.3985 },
  'hauptallee': { lat: 48.2075, lng: 16.4055 },
  'kaiserwiese': { lat: 48.2175, lng: 16.3955 },
  'alte donau': { lat: 48.2395, lng: 16.4255 },
  'friedrich-julius-bieber-anlage': { lat: 48.1855, lng: 16.2955 },
  'kurpark oberlaa': { lat: 48.1525, lng: 16.4025 },
  'schweizergarten': { lat: 48.1885, lng: 16.3865 },
  'arenawiese': { lat: 48.2045, lng: 16.4085 },
  'pötzleinsdorfer schlosspark': { lat: 48.2435, lng: 16.3085 },
  'poetzleinsdorfer schlosspark': { lat: 48.2435, lng: 16.3085 },
  'liechtensteinpark': { lat: 48.2225, lng: 16.3595 },
  'palais liechtenstein': { lat: 48.2225, lng: 16.3595 },
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
  'lammgasse': { lat: 48.2135, lng: 16.3515 },
  'manas yoga': { lat: 48.2162, lng: 16.3705 },
  'franz-josefs-kai': { lat: 48.2140, lng: 16.3725 },
  'franz josefs kai': { lat: 48.2140, lng: 16.3725 },
  'mariahilfer straße': { lat: 48.1985, lng: 16.3485 },
  'mariahilfer strasse': { lat: 48.1985, lng: 16.3485 },
  'gumpendorfer straße': { lat: 48.1945, lng: 16.3515 },
  'gumpendorfer strasse': { lat: 48.1945, lng: 16.3515 },
  'neubaugasse': { lat: 48.2015, lng: 16.3485 },
  'zollergasse': { lat: 48.2005, lng: 16.3515 },
  'kirchengasse': { lat: 48.2015, lng: 16.3525 },
  'lindengasse': { lat: 48.1995, lng: 16.3505 },
  'währinger straße': { lat: 48.2235, lng: 16.3535 },
  'waehringer strasse': { lat: 48.2235, lng: 16.3535 },
  'alser straße': { lat: 48.2155, lng: 16.3485 },
  'alser strasse': { lat: 48.2155, lng: 16.3485 },
  'thaliastraße': { lat: 48.2105, lng: 16.3325 },
  'thaliastrasse': { lat: 48.2105, lng: 16.3325 },
  'ottakringer straße': { lat: 48.2145, lng: 16.3285 },
  'ottakringer strasse': { lat: 48.2145, lng: 16.3285 },
  'taborstraße': { lat: 48.2205, lng: 16.3815 },
  'taborstrasse': { lat: 48.2205, lng: 16.3815 },
  'landstraßer hauptstraße': { lat: 48.2005, lng: 16.3915 },
  'landstrasser hauptstrasse': { lat: 48.2005, lng: 16.3915 },
  'favoritenstraße': { lat: 48.1825, lng: 16.3745 },
  'favoritenstrasse': { lat: 48.1825, lng: 16.3745 },
  'simmeringer hauptstraße': { lat: 48.1725, lng: 16.4285 },
  'simmeringer hauptstrasse': { lat: 48.1725, lng: 16.4285 },
  'wiedner hauptstraße': { lat: 48.1925, lng: 16.3655 },
  'wiedner hauptstrasse': { lat: 48.1925, lng: 16.3655 },
  'margaretenstraße': { lat: 48.1935, lng: 16.3575 },
  'margaretenstrasse': { lat: 48.1935, lng: 16.3575 },
  'schönbrunner straße': { lat: 48.1875, lng: 16.3385 },
  'schoenbrunner strasse': { lat: 48.1875, lng: 16.3385 },
  'linke wienzeile': { lat: 48.1965, lng: 16.3585 },
  'rechte wienzeile': { lat: 48.1955, lng: 16.3605 },
};

// Vienna District Centroids for postal code fallbacks (e.g. "1050 Wien" -> Margareten instead of 1st district)
export const VIENNA_DISTRICTS: Record<string, Coordinates> = {
  '1010': { lat: 48.2082, lng: 16.3738 }, // Innere Stadt
  '1020': { lat: 48.2185, lng: 16.3955 }, // Leopoldstadt
  '1030': { lat: 48.1985, lng: 16.3925 }, // Landstraße
  '1040': { lat: 48.1935, lng: 16.3685 }, // Wieden
  '1050': { lat: 48.1855, lng: 16.3565 }, // Margareten
  '1060': { lat: 48.1955, lng: 16.3495 }, // Mariahilf
  '1070': { lat: 48.2025, lng: 16.3485 }, // Neubau
  '1080': { lat: 48.2115, lng: 16.3495 }, // Josefstadt
  '1090': { lat: 48.2235, lng: 16.3585 }, // Alsergrund
  '1100': { lat: 48.1655, lng: 16.3815 }, // Favoriten
  '1110': { lat: 48.1685, lng: 16.4385 }, // Simmering
  '1120': { lat: 48.1735, lng: 16.3325 }, // Meidling
  '1130': { lat: 48.1825, lng: 16.2755 }, // Hietzing
  '1140': { lat: 48.2055, lng: 16.2725 }, // Penzing
  '1150': { lat: 48.1975, lng: 16.3285 }, // Rudolfsheim-Fünfhaus
  '1160': { lat: 48.2125, lng: 16.3155 }, // Ottakring
  '1170': { lat: 48.2255, lng: 16.3055 }, // Hernals
  '1180': { lat: 48.2335, lng: 16.3325 }, // Währing
  '1190': { lat: 48.2525, lng: 16.3455 }, // Döbling
  '1200': { lat: 48.2365, lng: 16.3755 }, // Brigittenau
  '1210': { lat: 48.2785, lng: 16.4025 }, // Floridsdorf
  '1220': { lat: 48.2385, lng: 16.4525 }, // Donaustadt
  '1230': { lat: 48.1455, lng: 16.3185 }, // Liesing
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
    .replace(/[,\.\-\/\\()"„“»«'–—]/g, ' ')
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

  // 3. District Postal Code Resolution (e.g., "1050 Wien", "1160", etc.)
  const postalMatch = normalized.match(/\b(1[0-2][0-9]0)\b/);
  if (postalMatch && VIENNA_DISTRICTS[postalMatch[1]]) {
    return VIENNA_DISTRICTS[postalMatch[1]];
  }

  return null;
}
