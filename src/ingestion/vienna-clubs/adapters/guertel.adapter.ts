import * as cheerio from 'cheerio';
import { Prisma } from '@prisma/client';
import { VIENNA_VENUES } from '../../../common/constants/vienna-venues';
import { detectIsFree } from '../../../common/utils/pricing.util';
import { applyViennaTime } from '../../../common/utils/time.util';

interface GuertelJsonLdEvent {
  '@type'?: string | string[];
  name?: string;
  description?: string;
  image?: string;
  url?: string;
  startDate?: string;
  endDate?: string;
}

export function parseGuertelAndBarEvents(
  html: string,
  venue: 'Fledermaus' | 'Jenseits' | 'Carina' | 'Concerto' | 'Martin Sepp',
  todayStart: Date,
  tomorrowEnd: Date,
): Prisma.EventCreateInput[] {
  const events: Prisma.EventCreateInput[] = [];
  const $ = cheerio.load(html || '');
  const venueKeyMap: Record<string, string> = {
    'Fledermaus': 'cabaret fledermaus',
    'Jenseits': 'tanzcafé jenseits',
    'Carina': 'cafe carina',
    'Concerto': 'café concerto',
    'Martin Sepp': 'heuriger zum martin sepp'
  };
  const venueKey = venueKeyMap[venue];
  const coords = VIENNA_VENUES[venueKey] || { lat: 48.2075, lng: 16.3705 };
  const fallbackUrlMap: Record<string, string> = {
    'Fledermaus': 'https://www.fledermaus.at',
    'Jenseits': 'https://tanzcafe-jenseits.com',
    'Carina': 'https://cafecarina.at',
    'Concerto': 'https://cafeconcerto.at',
    'Martin Sepp': 'https://martinsepp.at'
  };
  const fallbackUrl = fallbackUrlMap[venue];

  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const raw = JSON.parse($(el).html() || '');
      const items: GuertelJsonLdEvent[] = Array.isArray(raw) ? raw : [raw];

      for (const item of items) {
        const types = Array.isArray(item['@type']) ? item['@type'] : [item['@type']];
        if (!types.includes('Event') || !item.name || !item.startDate) continue;

        const start = new Date(item.startDate);
        if (isNaN(start.getTime())) continue;

        if (start < todayStart || start > tomorrowEnd) continue;

        let end = item.endDate ? new Date(item.endDate) : new Date(start.getTime() + 4 * 3600000);
        
        // Fix negative duration if end is before start
        if (end < start) {
          end = new Date(start.getTime() + 4 * 3600000);
        }

        const cleanDesc = item.description
          ? cheerio.load(item.description).text().trim().replace(/\s+/g, ' ')
          : '';

        const isFree = detectIsFree('VIENNA_CLUBS', item.name, cleanDesc) ?? false;

        let category = 'Nightlife';
        if (venue === 'Carina' || venue === 'Concerto' || venue === 'Martin Sepp') {
          category = 'Music';
        }

        events.push({
          externalId: `${venueKey.replace(/\s+/g, '')}-${start.toISOString().split('T')[0]}-${item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 30)}`,
          provider: 'VIENNA_CLUBS',
          title: item.name.trim(),
          description: cleanDesc ? cleanDesc.substring(0, 1500) : null,
          category,
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
