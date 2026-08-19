import * as cheerio from 'cheerio';
import { Prisma } from '@prisma/client';
import { VIENNA_VENUES } from '../../../common/constants/vienna-venues';
import { detectIsFree } from '../../../common/utils/pricing.util';
import { createViennaDate } from '../../../common/utils/time.util';

export function parseViperRoomEvents(
  html: string,
  todayStart: Date,
  tomorrowEnd: Date,
): Prisma.EventCreateInput[] {
  const events: Prisma.EventCreateInput[] = [];
  const $ = cheerio.load(html);
  const venueCoords = VIENNA_VENUES['viper room'] || { lat: 48.1963, lng: 16.3985 };
  const currentYear = new Date().getFullYear();

  $('.event_item').each((_, el) => {
    try {
      const dateText = $(el).find('.event_date_monthyear').text().trim(); // e.g. "20.08."
      const nameText = $(el).find('.event_name').text().trim(); // e.g. "Live: ANETTE OLZON"
      const url = $(el).find('a.event_inner').attr('href') || 'https://www.viper-room.at';

      if (!dateText || !nameText) return;

      const dateMatch = dateText.match(/(\d{1,2})\.(\d{1,2})/);
      if (!dateMatch) return;

      const day = parseInt(dateMatch[1], 10);
      const month = parseInt(dateMatch[2], 10);

      // Default start time for Viper Room live shows / clubnights is 20:00 (doors 19:00)
      const isLive = nameText.toLowerCase().includes('live');
      const startHour = isLive ? 20 : 22;
      const start = createViennaDate(currentYear, month, day, startHour, 0);

      if (start < todayStart || start > tomorrowEnd) return;

      const end = new Date(start.getTime() + 5 * 3600000);
      const isFree = detectIsFree('VIENNA_CLUBS', nameText, 'Viper Room Vienna') ?? false;
      const slug = url.replace(/https?:\/\/(?:www\.)?viper-room\.at\/events\//, '').replace(/\/$/, '');

      events.push({
        externalId: `viperroom-${slug}-${start.toISOString().split('T')[0]}`,
        provider: 'VIENNA_CLUBS',
        title: nameText,
        description: `Event im Viper Room Wien (Landstraßer Hauptstraße 38). Beginn ca. ${startHour}:00 Uhr.`,
        category: isLive ? 'Music' : 'Nightlife',
        url,
        imageUrl: null, // Strictly Option 2: 100% legal safety
        startTime: start,
        endTime: end,
        venueName: 'Viper Room',
        latitude: venueCoords.lat,
        longitude: venueCoords.lng,
        isFree,
      });
    } catch {
      // Ignore malformed items
    }
  });

  return events;
}
