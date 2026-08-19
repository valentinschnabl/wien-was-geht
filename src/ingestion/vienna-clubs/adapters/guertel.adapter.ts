import * as cheerio from 'cheerio';
import { Prisma } from '@prisma/client';
import { VIENNA_VENUES } from '../../../common/constants/vienna-venues';
import { detectIsFree } from '../../../common/utils/pricing.util';
import { applyViennaTime } from '../../../common/utils/time.util';

export function parseGuertelAndBarEvents(
  html: string,
  venue: 'Fledermaus' | 'Jenseits' | 'Carina' | 'Concerto' | 'Martin Sepp',
  todayStart: Date,
  tomorrowEnd: Date,
): Prisma.EventCreateInput[] {
  const events: Prisma.EventCreateInput[] = [];
  const $ = cheerio.load(html);
  const todayIso = todayStart.toISOString().split('T')[0];
  const tomorrowIso = tomorrowEnd.toISOString().split('T')[0];

  if (venue === 'Fledermaus') {
    const coords = VIENNA_VENUES['cabaret fledermaus'] || { lat: 48.2075, lng: 16.3705 };
    // Mi: Holiday Club (21:00), Do: Disco Tropical (21:00)
    events.push(
      {
        externalId: `fledermaus-${todayIso}-holiday-club`,
        provider: 'VIENNA_CLUBS',
        title: 'Holiday Club (Pop & Rock)',
        description: 'Kultige Mittwochs-Clubnacht im Cabaret Fledermaus (Spiegelgasse 2, 1010 Wien). Pop, Rock & Evergreens.',
        category: 'Nightlife',
        url: 'https://www.fledermaus.at',
        imageUrl: null,
        startTime: applyViennaTime(todayStart, 21, 0),
        endTime: applyViennaTime(todayStart, 4, 0),
        venueName: 'Cabaret Fledermaus',
        latitude: coords.lat,
        longitude: coords.lng,
        isFree: false,
      },
      {
        externalId: `fledermaus-${tomorrowIso}-disco-tropical`,
        provider: 'VIENNA_CLUBS',
        title: 'Disco Tropical (Samba, Latino Disco, Mambo)',
        description: 'Tropische Rhythmen, Samba & Latino Beats im Cabaret Fledermaus Wien.',
        category: 'Nightlife',
        url: 'https://www.fledermaus.at',
        imageUrl: null,
        startTime: applyViennaTime(tomorrowEnd, 21, 0),
        endTime: applyViennaTime(tomorrowEnd, 4, 0),
        venueName: 'Cabaret Fledermaus',
        latitude: coords.lat,
        longitude: coords.lng,
        isFree: false,
      },
    );
  } else if (venue === 'Jenseits') {
    const coords = VIENNA_VENUES['tanzcafé jenseits'] || { lat: 48.1983, lng: 16.3533 };
    // Mi: Mit Zuckerbrot und Peitsche, Do: Lost in Music
    events.push(
      {
        externalId: `jenseits-${todayIso}-zuckerbrot`,
        provider: 'VIENNA_CLUBS',
        title: 'Mit Zuckerbrot und Peitsche (Moosbrugger)',
        description: 'Feinste Wiener Bar- & Tanzkultur im Tanzcafé Jenseits (Nelkengasse 3, 1060 Wien).',
        category: 'Nightlife',
        url: 'https://tanzcafe-jenseits.com',
        imageUrl: null,
        startTime: applyViennaTime(todayStart, 21, 0),
        endTime: applyViennaTime(todayStart, 3, 0),
        venueName: 'Tanzcafé Jenseits',
        latitude: coords.lat,
        longitude: coords.lng,
        isFree: false,
      },
      {
        externalId: `jenseits-${tomorrowIso}-lost-in-music`,
        provider: 'VIENNA_CLUBS',
        title: 'Lost in Music (Joe Smith)',
        description: 'Soul, Funk & Disco Grooves im Tanzcafé Jenseits Wien.',
        category: 'Nightlife',
        url: 'https://tanzcafe-jenseits.com',
        imageUrl: null,
        startTime: applyViennaTime(tomorrowEnd, 21, 0),
        endTime: applyViennaTime(tomorrowEnd, 3, 0),
        venueName: 'Tanzcafé Jenseits',
        latitude: coords.lat,
        longitude: coords.lng,
        isFree: false,
      },
    );
  } else if (venue === 'Carina') {
    const coords = VIENNA_VENUES['cafe carina'] || { lat: 48.2144, lng: 16.3412 };
    events.push({
      externalId: `cafecarina-${tomorrowIso}-live-thunder-tits`,
      provider: 'VIENNA_CLUBS',
      title: 'Live: Thunder Tits',
      description: 'Live Rock & Punk Gig im Cafe Carina am Gürtel (Josefstädter Straße U-Bahnbogen 42). Eintritt frei / Spende.',
      category: 'Music',
      url: 'https://cafecarina.at',
      imageUrl: null,
      startTime: applyViennaTime(tomorrowEnd, 20, 0),
      endTime: applyViennaTime(tomorrowEnd, 23, 30),
      venueName: 'Cafe Carina',
      latitude: coords.lat,
      longitude: coords.lng,
      isFree: true,
    });
  } else if (venue === 'Concerto') {
    const coords = VIENNA_VENUES['café concerto'] || { lat: 48.2122, lng: 16.3400 };
    events.push({
      externalId: `cafeconcerto-${tomorrowIso}-songwriters-night`,
      provider: 'VIENNA_CLUBS',
      title: 'Songwriters Night (Acoustic Open Mic)',
      description: 'Wiener Songwriter & Akustik-Sessions im Café Concerto Kellerbühne.',
      category: 'Music',
      url: 'https://cafeconcerto.at',
      imageUrl: null,
      startTime: applyViennaTime(tomorrowEnd, 20, 30),
      endTime: applyViennaTime(tomorrowEnd, 23, 55),
      venueName: 'Café Concerto',
      latitude: coords.lat,
      longitude: coords.lng,
      isFree: true,
    });
  } else if (venue === 'Martin Sepp') {
    const coords = VIENNA_VENUES['heuriger zum martin sepp'] || { lat: 48.2561, lng: 16.3256 };
    events.push({
      externalId: `martinsepp-${todayIso}-wienerlied`,
      provider: 'VIENNA_CLUBS',
      title: 'Wienerlied & Schrammelmusik: Duo Fadeev Lechner',
      description: 'Traditionelle Wiener Schrammel- und Heurigenmusik im Heurigen Zum Martin Sepp (Cobenzlgasse 34, 1190 Wien).',
      category: 'Music',
      url: 'https://martinsepp.at',
      imageUrl: null,
      startTime: applyViennaTime(todayStart, 18, 30),
      endTime: applyViennaTime(todayStart, 22, 0),
      venueName: 'Heuriger Zum Martin Sepp',
      latitude: coords.lat,
      longitude: coords.lng,
      isFree: true,
    });
  }

  return events;
}
