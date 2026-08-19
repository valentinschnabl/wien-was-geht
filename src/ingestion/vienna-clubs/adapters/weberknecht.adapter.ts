import * as cheerio from 'cheerio';
import { Prisma } from '@prisma/client';
import { VIENNA_VENUES } from '../../../common/constants/vienna-venues';
import { detectIsFree } from '../../../common/utils/pricing.util';

interface WeberknechtJsonLdEvent {
  '@type'?: string;
  name?: string;
  description?: string;
  image?: string;
  url?: string;
  startDate?: string;
  endDate?: string;
}

export function parseWeberknechtEvents(
  html: string,
  todayStart: Date,
  tomorrowEnd: Date,
): Prisma.EventCreateInput[] {
  const events: Prisma.EventCreateInput[] = [];
  const $ = cheerio.load(html);
  const venueCoords = VIENNA_VENUES['weberknecht'] || { lat: 48.2117, lng: 16.3403 };

  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const raw = JSON.parse($(el).html() || '');
      const items: WeberknechtJsonLdEvent[] = Array.isArray(raw) ? raw : [raw];

      for (const item of items) {
        if (item['@type'] !== 'Event' || !item.name || !item.startDate) continue;

        const nameLower = item.name.trim().toLowerCase();
        if (nameLower === 'home' || nameLower === 'weberknecht' || nameLower === 'programm') {
          continue;
        }

        const start = new Date(item.startDate);
        if (isNaN(start.getTime())) continue;

        if (start < todayStart || start > tomorrowEnd) continue;

        const end = item.endDate ? new Date(item.endDate) : new Date(start.getTime() + 6 * 3600000);

        const cleanDesc = item.description
          ? cheerio.load(item.description).text().trim().replace(/\s+/g, ' ')
          : '';

        const isFree = detectIsFree('VIENNA_CLUBS', item.name, cleanDesc) ?? false;

        const slug = item.url
          ? item.url.replace(/https?:\/\/weberknecht\.(?:at|net)\/event\//, '').replace(/\/$/, '')
          : item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

        const isMusic =
          nameLower.includes('band') ||
          nameLower.includes('live') ||
          nameLower.includes('metal') ||
          nameLower.includes('rock');

        events.push({
          externalId: `weberknecht-${slug}-${start.toISOString().split('T')[0]}`,
          provider: 'VIENNA_CLUBS',
          title: item.name.trim(),
          description: cleanDesc ? cleanDesc.substring(0, 1500) : 'Weberknecht Club & Livestage Event.',
          category: isMusic ? 'Music' : 'Nightlife',
          url: item.url || 'https://www.weberknecht.net',
          imageUrl: null, // Strictly Option 2
          startTime: start,
          endTime: end,
          venueName: 'Weberknecht',
          latitude: venueCoords.lat,
          longitude: venueCoords.lng,
          isFree,
        });
      }
    } catch (parseErr) {
      // silently skip non-event JSON-LD
    }
  });

  return events;
}
