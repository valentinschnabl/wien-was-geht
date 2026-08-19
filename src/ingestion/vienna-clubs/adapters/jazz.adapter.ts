import * as cheerio from 'cheerio';
import { Prisma } from '@prisma/client';
import { VIENNA_VENUES } from '../../../common/constants/vienna-venues';
import { detectIsFree } from '../../../common/utils/pricing.util';
import { applyViennaTime } from '../../../common/utils/time.util';

interface JazzJsonLdEvent {
  '@type'?: string | string[];
  name?: string;
  description?: string;
  image?: string;
  url?: string;
  startDate?: string;
  endDate?: string;
}

export function parseJazzClubEvents(
  html: string,
  venue: 'Jazzland' | 'Zwe' | 'Frau Mayer',
  todayStart: Date,
  tomorrowEnd: Date,
): Prisma.EventCreateInput[] {
  const events: Prisma.EventCreateInput[] = [];
  const $ = cheerio.load(html || '');
  const venueKey = venue.toLowerCase();
  const coords = VIENNA_VENUES[venueKey] || { lat: 48.2128, lng: 16.3744 };
  const fallbackUrl =
    venue === 'Jazzland' ? 'https://www.jazzland.at' :
    venue === 'Zwe' ? 'https://www.zwe.cc' :
    'https://www.fraumayer.at';

  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const raw = JSON.parse($(el).html() || '');
      const items: JazzJsonLdEvent[] = Array.isArray(raw) ? raw : [raw];

      for (const item of items) {
        const types = Array.isArray(item['@type']) ? item['@type'] : [item['@type']];
        if (!types.includes('Event') || !item.name || !item.startDate) continue;

        const start = new Date(item.startDate);
        if (isNaN(start.getTime())) continue;

        if (start < todayStart || start > tomorrowEnd) continue;

        const end = item.endDate ? new Date(item.endDate) : new Date(start.getTime() + 4 * 3600000);

        const cleanDesc = item.description
          ? cheerio.load(item.description).text().trim().replace(/\s+/g, ' ')
          : '';

        const isFree = detectIsFree('VIENNA_CLUBS', item.name, cleanDesc) ?? false;

        events.push({
          externalId: `${venueKey}-${start.toISOString().split('T')[0]}-${item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 30)}`,
          provider: 'VIENNA_CLUBS',
          title: item.name.trim(),
          description: cleanDesc ? cleanDesc.substring(0, 1500) : null,
          category: 'Music',
          url: item.url || fallbackUrl,
          imageUrl: item.image || null,
          startTime: start,
          endTime: end,
          venueName: venue,
          latitude: coords.lat,
          longitude: coords.lng,
          isFree,
        });
      }
    } catch (parseErr) {
      // silently skip non-event JSON-LD
    }
  });

  return events;
}
