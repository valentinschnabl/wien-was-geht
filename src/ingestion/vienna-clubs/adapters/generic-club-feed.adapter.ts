import * as cheerio from 'cheerio';
import { Prisma } from '@prisma/client';
import { resolveViennaVenueCoordinates, VIENNA_VENUES } from '../../../common/constants/vienna-venues';
import { detectIsFree } from '../../../common/utils/pricing.util';

export function parseGenericClubEvents(
  html: string,
  venueName: string,
  defaultCategory: string,
  todayStart: Date,
  tomorrowEnd: Date,
  baseUrl: string = '',
): Prisma.EventCreateInput[] {
  const events: Prisma.EventCreateInput[] = [];
  const $ = cheerio.load(html);
  const coords = resolveViennaVenueCoordinates(venueName) || VIENNA_VENUES[venueName.toLowerCase()] || { lat: 48.2082, lng: 16.3738 };
  const seenIds = new Set<string>();

  // 1. Check Schema.org / JSON-LD
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const raw = JSON.parse($(el).html() || '');
      const items: any[] = Array.isArray(raw)
        ? raw
        : raw['@graph'] && Array.isArray(raw['@graph'])
        ? raw['@graph']
        : [raw];

      for (const item of items) {
        if (item['@type'] !== 'Event' || !item.name || !item.startDate) continue;

        const nameLower = item.name.trim().toLowerCase();
        if (
          nameLower === 'home' ||
          nameLower === 'programm' ||
          nameLower === venueName.toLowerCase() ||
          nameLower.includes('startseite')
        ) {
          continue;
        }

        const start = new Date(item.startDate);
        if (isNaN(start.getTime())) continue;

        if (start < todayStart || start > tomorrowEnd) continue;

        const end = item.endDate ? new Date(item.endDate) : new Date(start.getTime() + 5 * 3600000);
        const cleanDesc = item.description
          ? cheerio.load(item.description).text().trim().replace(/\s+/g, ' ')
          : '';

        const isFree = detectIsFree('VIENNA_CLUBS', item.name, cleanDesc) ?? false;
        const targetUrl = item.url
          ? (item.url.startsWith('http') ? item.url : `${baseUrl}${item.url}`)
          : baseUrl || 'https://wienwasgeht.at';

        const idSuffix = `${venueName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${start.toISOString().split('T')[0]}-${item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 30)}`;

        if (seenIds.has(idSuffix)) continue;
        seenIds.add(idSuffix);

        events.push({
          externalId: `club-${idSuffix}`,
          provider: 'VIENNA_CLUBS',
          title: item.name.trim(),
          description: cleanDesc ? cleanDesc.substring(0, 1500) : `${venueName} Event in Wien.`,
          category: defaultCategory,
          url: targetUrl,
          imageUrl: null, // Strictly Option 2: 100% legal safety
          startTime: start,
          endTime: end,
          venueName,
          latitude: coords.lat,
          longitude: coords.lng,
          isFree,
        });
      }
    } catch {
      // Ignore JSON parse errors
    }
  });

  return events;
}
