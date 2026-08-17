import * as cheerio from 'cheerio';
import { Prisma } from '@prisma/client';
import { VIENNA_VENUES } from '../../../common/constants/vienna-venues';
import { detectIsFree } from '../../../common/utils/pricing.util';

export function parseChelseaEvents(
  html: string,
  todayStart: Date,
  _tomorrowEnd: Date,
): Prisma.EventCreateInput[] {
  const events: Prisma.EventCreateInput[] = [];
  const $ = cheerio.load(html);
  const bodyText = $('body').text();

  const match = bodyText.match(/Tonight Live:\s*([^\n\r]+?)(?=\s*CHELSEA|\s*MUSICPLACE|$)/i);
  if (match && match[1]) {
    const act = match[1].trim();
    if (act.length > 2 && !act.toLowerCase().includes('closed') && !act.toLowerCase().includes('ruhetag')) {
      const start = new Date(todayStart);
      start.setHours(20, 30, 0, 0); // Chelsea live shows typically start at 20:30
      const end = new Date(todayStart);
      end.setHours(23, 30, 0, 0);

      const venueCoords = VIENNA_VENUES['chelsea'] || { lat: 48.2155, lng: 16.3425 };
      const isFree = detectIsFree('VIENNA_CLUBS', act, 'Live at Chelsea Vienna') ?? false;

      events.push({
        externalId: `chelsea-${start.toISOString().split('T')[0]}-${act.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        provider: 'VIENNA_CLUBS',
        title: `Live: ${act}`,
        description: `Tonight Live Concert at Chelsea Gürtel: ${act}. Doors open 18:00, live on stage approx. 20:30.`,
        category: 'Music',
        url: 'https://www.chelsea.co.at',
        imageUrl: null,
        startTime: start,
        endTime: end,
        venueName: 'Chelsea',
        latitude: venueCoords.lat,
        longitude: venueCoords.lng,
        isFree,
      });
    }
  }

  return events;
}
