import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Prisma } from '@prisma/client';
import * as cheerio from 'cheerio';
import { IEventProvider } from '../../interfaces/event-provider.interface';
import { resolveViennaVenueCoordinates } from '../../common/constants/vienna-venues';
import { createViennaDate } from '../../common/utils/time.util';

@Injectable()
export class PartytimerService implements IEventProvider {
  private readonly logger = new Logger(PartytimerService.name);

  constructor(private readonly httpService: HttpService) {}

  async fetchEvents(): Promise<Prisma.EventCreateInput[]> {
    try {
      this.logger.log('Fetching Vienna club, concert & nightlife events from partytimer.at...');

      const now = new Date();
      const currentYear = now.getFullYear();

      const yearStr = String(now.getFullYear());
      const monthStr = String(now.getMonth() + 1).padStart(2, '0');
      const dayStr = String(now.getDate()).padStart(2, '0');
      const fromDate = `${yearStr}-${monthStr}-${dayStr}`;

      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const toYearStr = String(tomorrow.getFullYear());
      const toMonthStr = String(tomorrow.getMonth() + 1).padStart(2, '0');
      const toDayStr = String(tomorrow.getDate()).padStart(2, '0');
      const toDate = `${toYearStr}-${toMonthStr}-${toDayStr}`;

      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      const tomorrowEnd = new Date(tomorrow);
      tomorrowEnd.setHours(23, 59, 59, 999);

      const events: Prisma.EventCreateInput[] = [];
      const seenIds = new Set<string>();

      let page = 1;
      const maxPages = 8;

      while (page <= maxPages) {
        const pageUrl = `https://www.partytimer.at/events?from=${fromDate}&to=${toDate}&page=${page}`;

        try {
          const res = await firstValueFrom(
            this.httpService.get<string>(pageUrl, {
              headers: {
                'User-Agent':
                  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              },
              timeout: 8000,
            }),
          );

          const $ = cheerio.load(res.data);
          const links = $('a[href*="/events/"]').filter((_, a) => {
            const h = $(a).attr('href') || '';
            return /events\/\d+/.test(h);
          });

          if (links.length === 0) {
            break;
          }

          links.each((_, a) => {
            const href = $(a).attr('href') || '';
            const idMatch = href.match(/events\/(\d+)/);
            const rawId = idMatch ? idMatch[1] : '';
            if (!rawId || seenIds.has(rawId)) return;
            seenIds.add(rawId);

            const fullText = $(a).text().trim().replace(/\s+/g, ' ');

            // Check if free admission
            const isFree =
              fullText.toLowerCase().includes('freier eintritt') ||
              fullText.toLowerCase().includes('eintritt frei');

            // Parse Date, Time, Venue, District:
            // Example: "Event Party Crazy Mi 19.8., 18:00 Uhr VCBC - Vienna City Beach Club, 1220 Wien"
            const match = fullText.match(
              /(?:Mi|Do|Fr|Sa|So|Mo|Di)\s+(\d{1,2})\.(\d{1,2})\.\s*,\s*(\d{1,2}):(\d{2})\s*Uhr\s+(.*?)(?:,\s*(\d{4})\s*Wien|$)/,
            );

            if (!match) return;

            const day = parseInt(match[1], 10);
            const month = parseInt(match[2], 10);
            const hour = parseInt(match[3], 10);
            const minute = parseInt(match[4], 10);
            const venueRaw = match[5]?.trim() || 'Wien';

            const startTime = createViennaDate(currentYear, month, day, hour, minute);
            if (startTime < todayStart || startTime > tomorrowEnd) {
              return;
            }

            const endTime = new Date(startTime.getTime() + 4 * 3600000);

            // Extract Title and Category
            // Pattern: "Event [Category] (freier Eintritt|Empfohlen)? [Title] (Mi|Do|...)"
            const prefixMatch = fullText.match(
              /^Event\s+(.*?)\s+(?:freier Eintritt\s+|Empfohlen\s+)?(.*?)(?:Mi|Do|Fr|Sa|So|Mo|Di)\s+\d{1,2}\.\d{1,2}\./,
            );

            let rawCategory = 'Party';
            let title = fullText;

            if (prefixMatch) {
              rawCategory = prefixMatch[1].trim();
              title = prefixMatch[2].trim().replace(/\s+-\s*$/, '');
            }

            if (!title) {
              title = fullText;
            }

            // Category normalization
            let category = 'Nightlife';
            const catLower = rawCategory.toLowerCase();
            if (
              catLower.includes('jazz') ||
              catLower.includes('pop') ||
              catLower.includes('rock') ||
              catLower.includes('lokal') ||
              catLower.includes('hiphop')
            ) {
              category = 'Music';
            } else if (catLower.includes('party')) {
              category = 'Nightlife';
            }

            // Venue coordinates resolution
            const coords = resolveViennaVenueCoordinates(venueRaw);
            const latitude = coords?.lat ?? 48.2082;
            const longitude = coords?.lng ?? 16.3738;

            const targetUrl = href.startsWith('http')
              ? href
              : `https://www.partytimer.at${href}`;

            events.push({
              externalId: `partytimer-${rawId}`,
              provider: 'PARTYTIMER',
              title,
              description: `Veranstaltung in ${venueRaw}. Gefunden auf partytimer.at.`,
              category,
              url: targetUrl,
              imageUrl: null, // Strictly Option 2: 100% legal safety
              startTime,
              endTime,
              venueName: venueRaw,
              latitude,
              longitude,
              isFree,
            });
          });

          const hasNext = $(`a[href*="page=${page + 1}"]`).length > 0;
          if (!hasNext) break;
          page++;
        } catch (pageErr: any) {
          this.logger.debug(`Failed page ${page} from Partytimer: ${pageErr.message}`);
          break;
        }
      }

      this.logger.log(`Extracted ${events.length} active events from partytimer.at.`);
      return events;
    } catch (error) {
      this.logger.error('Failed to fetch events from partytimer.at', error);
      return [];
    }
  }
}
