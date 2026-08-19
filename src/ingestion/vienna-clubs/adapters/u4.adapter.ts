import * as cheerio from 'cheerio';
import { Prisma } from '@prisma/client';
import { VIENNA_VENUES } from '../../../common/constants/vienna-venues';
import { detectIsFree } from '../../../common/utils/pricing.util';

interface U4JsonLdEvent {
  '@type'?: string;
  name?: string;
  description?: string;
  image?: string;
  url?: string;
  startDate?: string;
  endDate?: string;
}

function parseFlexibleDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const direct = new Date(dateStr);
  if (!isNaN(direct.getTime())) return direct;

  // Fallback for non-padded formats like "2026-8-19T23:00+2:00"
  const normalized = dateStr.replace(
    /(\d{4})-(\d{1,2})-(\d{1,2})T(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?(?:([+-])(\d{1,2})(?::?(\d{1,2}))?)?/,
    (_, y, m, d, h, min, sec, sign, tzH, tzM) => {
      const mm = m.padStart(2, '0');
      const dd = d.padStart(2, '0');
      const hh = h.padStart(2, '0');
      const minmin = min.padStart(2, '0');
      const secsec = (sec || '00').padStart(2, '0');
      const tz = sign ? `${sign}${tzH.padStart(2, '0')}:${(tzM || '00').padStart(2, '0')}` : 'Z';
      return `${y}-${mm}-${dd}T${hh}:${minmin}:${secsec}${tz}`;
    },
  );
  const d = new Date(normalized);
  return isNaN(d.getTime()) ? null : d;
}

export function parseU4Events(
  html: string,
  todayStart: Date,
  tomorrowEnd: Date,
): Prisma.EventCreateInput[] {
  const events: Prisma.EventCreateInput[] = [];
  const $ = cheerio.load(html);
  const venueCoords = VIENNA_VENUES['u4'] || { lat: 48.1848, lng: 16.3292 };

  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const raw = JSON.parse($(el).html() || '');
      const items: U4JsonLdEvent[] = Array.isArray(raw) ? raw : [raw];

      for (const item of items) {
        if (item['@type'] !== 'Event' || !item.name || !item.startDate) continue;

        const nameLower = item.name.trim().toLowerCase();
        if (nameLower === 'events' || nameLower === 'u4' || nameLower === 'u4 club wien') {
          continue;
        }

        const start = parseFlexibleDate(item.startDate);
        if (!start) continue;

        if (start < todayStart || start > tomorrowEnd) continue;

        const end = item.endDate ? parseFlexibleDate(item.endDate) || new Date(start.getTime() + 6 * 3600000) : new Date(start.getTime() + 6 * 3600000);

        const cleanDesc = item.description
          ? cheerio.load(item.description).text().trim().replace(/\s+/g, ' ')
          : '';

        const isFree = detectIsFree('VIENNA_CLUBS', item.name, cleanDesc) ?? false;

        const slug = item.url
          ? item.url.replace(/https?:\/\/www\.u4\.at\/events\//, '').replace(/\/$/, '')
          : item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

        events.push({
          externalId: `u4-${slug}-${start.toISOString().split('T')[0]}`,
          provider: 'VIENNA_CLUBS',
          title: item.name.trim(),
          description: cleanDesc ? cleanDesc.substring(0, 1500) : 'U4 Club Wien Event.',
          category: 'Nightlife',
          url: item.url || 'https://www.u4.at/events/',
          imageUrl: null, // Strictly Option 2
          startTime: start,
          endTime: end,
          venueName: 'U4',
          latitude: venueCoords.lat,
          longitude: venueCoords.lng,
          isFree,
        });
      }
    } catch {
      // Ignore non-event JSON-LD
    }
  });

  return events;
}
