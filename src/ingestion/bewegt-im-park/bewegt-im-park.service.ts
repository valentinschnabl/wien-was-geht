import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as cheerio from 'cheerio';
import { Prisma } from '@prisma/client';
import { IEventProvider } from '../../interfaces/event-provider.interface';
import { resolveViennaVenueCoordinates } from '../../common/constants/vienna-venues';
import { createViennaDate } from '../../common/utils/time.util';

interface DistrictEndpoint {
  district: number;
  slug: string;
  name: string;
}

const VIENNA_DISTRICTS_LIST: DistrictEndpoint[] = [
  { district: 1, slug: 'wien-1-bezirk-innere-stadt', name: 'Innere Stadt' },
  { district: 2, slug: 'wien-2-bezirk-leopoldstadt', name: 'Leopoldstadt' },
  { district: 3, slug: 'wien-3-bezirk-landstrasse', name: 'Landstraße' },
  { district: 4, slug: 'wien-4-bezirk-wieden', name: 'Wieden' },
  { district: 5, slug: 'wien-5-bezirk-margareten', name: 'Margareten' },
  { district: 6, slug: 'wien-6-bezirk-mariahilf', name: 'Mariahilf' },
  { district: 7, slug: 'wien-7-bezirk-neubau', name: 'Neubau' },
  { district: 8, slug: 'wien-8-bezirk-josefstadt', name: 'Josefstadt' },
  { district: 9, slug: 'wien-9-bezirk-alsergrund', name: 'Alsergrund' },
  { district: 10, slug: 'wien-10-bezirk-favoriten', name: 'Favoriten' },
  { district: 11, slug: 'wien-11-bezirk-simmering', name: 'Simmering' },
  { district: 12, slug: 'wien-12-bezirk-meidling', name: 'Meidling' },
  { district: 13, slug: 'wien-13-bezirk-hietzing', name: 'Hietzing' },
  { district: 14, slug: 'wien-14-bezirk-penzing', name: 'Penzing' },
  { district: 15, slug: 'wien-15-bezirk-rudolfsheim-fuenfhaus', name: 'Rudolfsheim-Fünfhaus' },
  { district: 16, slug: 'wien-16-bezirk-ottakring', name: 'Ottakring' },
  { district: 17, slug: 'wien-17-bezirk-hernals', name: 'Hernals' },
  { district: 18, slug: 'wien-18-bezirk-waehring', name: 'Währing' },
  { district: 19, slug: 'wien-19-bezirk-doebling', name: 'Döbling' },
  { district: 20, slug: 'wien-20-bezirk-brigittenau', name: 'Brigittenau' },
  { district: 21, slug: 'wien-21-bezirk-floridsdorf', name: 'Floridsdorf' },
  { district: 22, slug: 'wien-22-bezirk-donaustadt', name: 'Donaustadt' },
  { district: 23, slug: 'wien-23-bezirk-liesing', name: 'Liesing' },
];

const GERMAN_WEEKDAYS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

@Injectable()
export class BewegtImParkService implements IEventProvider {
  private readonly logger = new Logger(BewegtImParkService.name);
  private readonly baseUrl = 'https://www.bewegt-im-park.at';

  constructor(private readonly httpService: HttpService) {}

  async fetchEvents(): Promise<Prisma.EventCreateInput[]> {
    this.logger.log('Fetching free outdoor sports & fitness courses from Bewegt im Park...');

    const now = new Date();
    const todayWeekday = GERMAN_WEEKDAYS[now.getDay()];
    const todayStr = now.toLocaleDateString('sv-SE'); // YYYY-MM-DD

    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowWeekday = GERMAN_WEEKDAYS[tomorrow.getDay()];
    const tomorrowStr = tomorrow.toLocaleDateString('sv-SE');

    const targetDays = [
      { weekdayName: todayWeekday, dateStr: todayStr },
      { weekdayName: tomorrowWeekday, dateStr: tomorrowStr },
    ];

    const allEvents: Prisma.EventCreateInput[] = [];
    const batchSize = 4;

    // Fetch in small concurrent batches of 4 to prevent server throttling
    for (let i = 0; i < VIENNA_DISTRICTS_LIST.length; i += batchSize) {
      const chunk = VIENNA_DISTRICTS_LIST.slice(i, i + batchSize);
      const districtFetches = chunk.map(async (dist) => {
        const url = `${this.baseUrl}/stadt/${dist.slug}`;
        try {
          const res = await firstValueFrom(
            this.httpService.get<string>(url, {
              headers: {
                'User-Agent':
                  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                Accept: 'text/html,application/xhtml+xml',
              },
              timeout: 12000,
            }),
          );

          return this.parseDistrictHtml(res.data, dist, targetDays);
        } catch (err) {
          this.logger.debug(`Could not fetch district ${dist.name}: ${(err as Error).message}`);
          return [];
        }
      });

      const results = await Promise.allSettled(districtFetches);
      results.forEach((r) => {
        if (r.status === 'fulfilled') {
          allEvents.push(...r.value);
        }
      });
    }

    this.logger.log(`Extracted ${allEvents.length} active Bewegt im Park sport sessions for today and tomorrow.`);
    return allEvents;
  }

  public parseDistrictHtml(
    html: string,
    dist: DistrictEndpoint,
    targetDays: { weekdayName: string; dateStr: string }[],
  ): Prisma.EventCreateInput[] {
    const $ = cheerio.load(html);
    const districtEvents: Prisma.EventCreateInput[] = [];

    // Find all day sections (Montag, Dienstag, etc.)
    $('h3, h4, .day-heading').each((_, headingEl) => {
      const dayName = $(headingEl).text().trim();
      const matchedTarget = targetDays.find((t) => t.weekdayName.toLowerCase() === dayName.toLowerCase());
      if (!matchedTarget) return;

      const parentSection = $(headingEl).parent();
      const sectionText = parentSection.text().replace(/\s+/g, ' ');

      // Extract each course block in this day section
      // Format example: "Kursdauer: 17.06. – 02.09. 18:00 – 19:00 Yoga in der Freien Mitte Ortsbezeichnung: (Parkanlage Nordbahnhof - Freie Mitte)"
      const courseRegex =
        /(\d{1,2}:\d{2})\s*–\s*(\d{1,2}:\d{2})\s+([^\n\r]+?)(?:\s+Ortsbezeichnung:\s*\(([^)]+)\)|\s+Kursinfo|$)/gi;

      let match: RegExpExecArray | null;
      while ((match = courseRegex.exec(sectionText)) !== null) {
        const startTimeStr = match[1].trim();
        const endTimeStr = match[2].trim();
        let courseTitle = match[3].trim();
        const venueDescription = match[4] ? match[4].trim() : `${dist.name} Park`;

        // Clean up course title
        courseTitle = courseTitle.replace(/^Kursinfo\s*/i, '').replace(/\s*Kursinfo$/i, '').trim();
        if (courseTitle.length < 3 || courseTitle.toLowerCase().includes('kursdauer')) continue;

        const fullTitle = `Bewegt im Park: ${courseTitle}`;
        const venueName = `${venueDescription}, Wien`;

        const start = createViennaDate(matchedTarget.dateStr, startTimeStr);
        const end = createViennaDate(matchedTarget.dateStr, endTimeStr);

        // Geocoding: Try venue description, district name, or fallback centroid
        const resolvedCoords =
          resolveViennaVenueCoordinates(venueDescription) ||
          resolveViennaVenueCoordinates(`${venueDescription} ${1000 + dist.district * 10} Wien`) ||
          resolveViennaVenueCoordinates(`${1000 + dist.district * 10} Wien`) || {
            lat: 48.2082,
            lng: 16.3738,
          };

        const slug = courseTitle
          .toLowerCase()
          .replace(/[^\p{L}\p{N}]/gu, '-')
          .replace(/-+/g, '-');
        const externalId = `bip-${dist.district}-${slug}-${matchedTarget.dateStr}-${startTimeStr.replace(':', '')}`;

        districtEvents.push({
          externalId,
          provider: 'BEWEGT_IM_PARK',
          title: fullTitle,
          description: `Kostenloser Outdoor-Sportkurs von Bewegt im Park in ${venueDescription} (${dist.name}). Keine Anmeldung erforderlich, einfach vorbeikommen und mitmachen!`,
          category: 'Sports',
          url: `https://www.bewegt-im-park.at/stadt/${dist.slug}`,
          imageUrl: null,
          startTime: start,
          endTime: end,
          venueName,
          latitude: resolvedCoords.lat,
          longitude: resolvedCoords.lng,
          isFree: true,
        });
      }
    });

    return districtEvents;
  }
}
