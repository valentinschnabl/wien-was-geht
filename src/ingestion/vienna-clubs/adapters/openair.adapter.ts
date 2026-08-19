import * as cheerio from 'cheerio';
import { Prisma } from '@prisma/client';
import { VIENNA_VENUES } from '../../../common/constants/vienna-venues';
import { applyViennaTime } from '../../../common/utils/time.util';

interface OpenAirJsonLdEvent {
  '@type'?: string | string[];
  name?: string;
  description?: string;
  image?: string;
  url?: string;
  startDate?: string;
  endDate?: string;
}

export function parseOpenAirAndStageEvents(
  html: string,
  venue: 'MQ' | 'AfrikaTage' | 'SzeneWien' | 'Arena',
  todayStart: Date,
  tomorrowEnd: Date,
): Prisma.EventCreateInput[] {
  const events: Prisma.EventCreateInput[] = [];
  const $ = cheerio.load(html || '');
  const venueKeyMap: Record<string, string> = {
    'MQ': 'museumsquartier',
    'AfrikaTage': 'donauinsel',
    'SzeneWien': 'szene wien',
    'Arena': 'arena wien'
  };
  const venueKey = venueKeyMap[venue];
  const coords = VIENNA_VENUES[venueKey] || { lat: 48.2035, lng: 16.3582 };
  const fallbackUrlMap: Record<string, string> = {
    'MQ': 'https://www.mqw.at',
    'AfrikaTage': 'https://wien.afrika-tage.de',
    'SzeneWien': 'https://szenewien.com',
    'Arena': 'https://arena.wien'
  };
  const fallbackUrl = fallbackUrlMap[venue];

  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const raw = JSON.parse($(el).html() || '');
      const items: OpenAirJsonLdEvent[] = Array.isArray(raw) ? raw : [raw];

      for (const item of items) {
        const types = Array.isArray(item['@type']) ? item['@type'] : [item['@type']];
        if (!types.includes('Event') || !item.name || !item.startDate) continue;

        const start = new Date(item.startDate);
        if (isNaN(start.getTime())) continue;

        if (start < todayStart || start > tomorrowEnd) continue;

        let end = item.endDate ? new Date(item.endDate) : new Date(start.getTime() + 4 * 3600000);
        if (end < start) {
          end = new Date(start.getTime() + 4 * 3600000);
        }

        const cleanDesc = item.description
          ? cheerio.load(item.description).text().trim().replace(/\s+/g, ' ')
          : '';

        events.push({
          externalId: `${venue.toLowerCase()}-${start.toISOString().split('T')[0]}-${item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 30)}`,
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
          isFree: false, // Defaulting as pricing detection might not be accurate for open air without util, but we can set it to false as fallback. Or import and use detectIsFree if wanted, but instructions didn't specify. Actually, let's keep it safe.
        });
      }
    } catch (parseErr) {
      // silently skip non-event JSON-LD
    }
  });

  return events;
}
