import * as cheerio from 'cheerio';
import { Prisma } from '@prisma/client';
import { VIENNA_VENUES } from '../../../common/constants/vienna-venues';
import { detectIsFree } from '../../../common/utils/pricing.util';

interface FlexJsonLdEvent {
  '@type'?: string;
  name?: string;
  description?: string;
  image?: string;
  url?: string;
  startDate?: string;
  endDate?: string;
}

export function parseFlexEvents(
  html: string,
  todayStart: Date,
  tomorrowEnd: Date,
): Prisma.EventCreateInput[] {
  const events: Prisma.EventCreateInput[] = [];
  const $ = cheerio.load(html);

  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const raw = JSON.parse($(el).html() || '');
      const items: FlexJsonLdEvent[] = Array.isArray(raw) ? raw : [raw];

      for (const item of items) {
        if (item['@type'] !== 'Event' || !item.name || !item.startDate) continue;

        const start = new Date(item.startDate);
        if (isNaN(start.getTime())) continue;

        // Scoped to today & tomorrow
        if (start < todayStart || start > tomorrowEnd) continue;

        const end = item.endDate ? new Date(item.endDate) : new Date(start.getTime() + 5 * 3600000);
        const venueCoords = VIENNA_VENUES['flex'] || { lat: 48.2185, lng: 16.3705 };

        // Clean description
        const cleanDesc = item.description
          ? cheerio.load(item.description).text().trim().replace(/\s+/g, ' ')
          : '';

        const isFree = detectIsFree('VIENNA_CLUBS', item.name, cleanDesc) ?? false;

        const slug = item.url
          ? item.url.replace(/https?:\/\/flex\.at\/event\//, '').replace(/\/$/, '')
          : item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

        events.push({
          externalId: `flex-${slug}-${start.toISOString().split('T')[0]}`,
          provider: 'VIENNA_CLUBS',
          title: item.name.trim(),
          description: cleanDesc ? cleanDesc.substring(0, 1500) : null,
          category: item.name.toLowerCase().includes('beat it') || item.name.toLowerCase().includes('rave') ? 'Nightlife' : 'Music',
          url: item.url || 'https://flex.at',
          imageUrl: item.image || null,
          startTime: start,
          endTime: end,
          venueName: 'Flex',
          latitude: venueCoords.lat,
          longitude: venueCoords.lng,
          isFree,
        });
      }
    } catch {
      // Ignore JSON parse errors for non-event JSON-LD scripts
    }
  });

  return events;
}
