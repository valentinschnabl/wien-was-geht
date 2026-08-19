import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Prisma } from '@prisma/client';
import * as cheerio from 'cheerio';
import { IEventProvider } from '../../interfaces/event-provider.interface';
import { resolveViennaVenueCoordinates } from '../../common/constants/vienna-venues';
import { applyViennaTime } from '../../common/utils/time.util';

interface ParsedEintrittFreiEvent {
  date: Date;
  title: string;
  description: string;
  startHour?: number;
  startMin?: number;
  endHour?: number;
  endMin?: number;
  venueName?: string;
  url: string;
}

@Injectable()
export class EintrittFreiService implements IEventProvider {
  private readonly logger = new Logger(EintrittFreiService.name);
  private readonly pageUrl = 'https://www.eintrittfrei.at/gratis-kulturprogramm/';

  private readonly monthsGerman = [
    'Jänner',
    'Februar',
    'März',
    'April',
    'Mai',
    'Juni',
    'Juli',
    'August',
    'September',
    'Oktober',
    'November',
    'Dezember',
  ];

  constructor(private readonly httpService: HttpService) {}

  async fetchEvents(): Promise<Prisma.EventCreateInput[]> {
    try {
      this.logger.log('Fetching curated free cultural events from eintrittfrei.at...');

      const response = await firstValueFrom(
        this.httpService.get<string>(this.pageUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
          timeout: 10000,
        }),
      );

      const html = response.data;
      if (!html) {
        this.logger.warn('Empty HTML response from eintrittfrei.at');
        return [];
      }

      const $ = cheerio.load(html);
      const now = new Date();

      const today = new Date(now);
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const targets = [
        {
          date: today,
          dayNum: today.getDate(),
          monthName: this.monthsGerman[today.getMonth()],
        },
        {
          date: tomorrow,
          dayNum: tomorrow.getDate(),
          monthName: this.monthsGerman[tomorrow.getMonth()],
        },
      ];

      const rawEvents: ParsedEintrittFreiEvent[] = [];

      $('h2, h3').each((_, headingEl) => {
        const headingText = $(headingEl).text().trim();

        // Match against today or tomorrow
        const matchedTarget = targets.find((t) => {
          const regex = new RegExp(`\\b${t.dayNum}\\.\\s*${t.monthName}\\b`, 'i');
          return regex.test(headingText);
        });

        if (!matchedTarget) return;

        let current = $(headingEl).next();
        let currentEvent: ParsedEintrittFreiEvent | null = null;

        while (current.length && !current.is('h2, h3')) {
          const tag = current[0].name;

          if (tag === 'h4') {
            if (currentEvent && currentEvent.title) {
              rawEvents.push(currentEvent);
            }
            currentEvent = {
              date: matchedTarget.date,
              title: current.text().trim(),
              description: '',
              venueName: 'Wien',
              url: this.pageUrl,
            };
          } else if (currentEvent) {
            if (tag === 'p') {
              const pText = current.text().trim();
              const link = current.find('a').attr('href');
              if (link && link.startsWith('http')) {
                currentEvent.url = link;
              }
              if (!pText.startsWith('>') && pText.length > 15) {
                currentEvent.description += (currentEvent.description ? ' ' : '') + pText;
              }
            } else if (tag === 'ul' || tag === 'ol') {
              const ulText = current.text();
              const timeMatch = ulText.match(
                /Uhrzeit:\s*(\d{1,2})[\.:](\d{2})(?:\s*bis\s*(\d{1,2})[\.:](\d{2}))?/i,
              );
              if (timeMatch) {
                currentEvent.startHour = parseInt(timeMatch[1], 10);
                currentEvent.startMin = parseInt(timeMatch[2], 10);
                if (timeMatch[3]) {
                  currentEvent.endHour = parseInt(timeMatch[3], 10);
                  currentEvent.endMin = parseInt(timeMatch[4] || '00', 10);
                }
              }

              const ortMatch = ulText.match(/Ort:\s*([^\n\r]+)/i);
              if (ortMatch) {
                currentEvent.venueName = ortMatch[1].trim();
              }
            }
          }

          current = current.next();
        }

        if (currentEvent && currentEvent.title) {
          rawEvents.push(currentEvent);
        }
      });

      this.logger.log(`Found ${rawEvents.length} raw events on eintrittfrei.at for today and tomorrow.`);

      return this.normalizeEvents(rawEvents);
    } catch (error) {
      this.logger.error('Failed to fetch events from eintrittfrei.at', error);
      return [];
    }
  }

  private normalizeEvents(rawList: ParsedEintrittFreiEvent[]): Prisma.EventCreateInput[] {
    const normalized: Prisma.EventCreateInput[] = [];

    for (const item of rawList) {
      const cleanTitle = item.title
        .replace(/^VOLXkino:\s*/i, 'VOLXkino: ')
        .replace(/^Filmfestival am Rathausplatz:\s*/i, 'Filmfestival Rathausplatz: ')
        .trim();

      const startTime = applyViennaTime(
        item.date,
        item.startHour ?? 19,
        item.startMin ?? 0,
      );

      let endTime: Date;
      if (item.endHour !== undefined && item.endMin !== undefined) {
        endTime = applyViennaTime(
          item.date,
          item.endHour,
          item.endMin,
        );
        if (endTime <= startTime) {
          endTime = new Date(endTime.getTime() + 24 * 60 * 60 * 1000);
        }
      } else {
        endTime = new Date(startTime.getTime() + 3 * 60 * 60 * 1000);
      }

      // Resolve venue & coordinates
      const venueClean = item.venueName || 'Wien';
      const coords = resolveViennaVenueCoordinates(venueClean) ||
        resolveViennaVenueCoordinates(cleanTitle) || { lat: 48.2082, lng: 16.3738 };

      const year = startTime.getFullYear();
      const month = String(startTime.getMonth() + 1).padStart(2, '0');
      const day = String(startTime.getDate()).padStart(2, '0');
      const slug = this.slugify(cleanTitle);
      const externalId = `eintrittfrei-${year}${month}${day}-${slug}`;

      let category = 'Culture';
      const lower = (cleanTitle + ' ' + item.description).toLowerCase();
      if (lower.includes('konzert') || lower.includes('musik') || lower.includes('schrammeln') || lower.includes('tunes')) {
        category = 'Music';
      } else if (lower.includes('film') || lower.includes('kino') || lower.includes('theater') || lower.includes('museum')) {
        category = 'Culture';
      }

      normalized.push({
        externalId,
        provider: 'EINTRITT_FREI',
        title: cleanTitle,
        description: item.description
          ? `${item.description} (Eintritt frei / Kostenlos)`
          : `Kostenlose Kulturveranstaltung in Wien: ${cleanTitle} @ ${venueClean}. (Eintritt frei)`,
        category,
        url: item.url,
        imageUrl: null,
        startTime,
        endTime,
        venueName: venueClean,
        latitude: coords.lat,
        longitude: coords.lng,
        isFree: true,
      });
    }

    return normalized;
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 45);
  }
}
