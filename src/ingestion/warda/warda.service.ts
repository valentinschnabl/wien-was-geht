import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Prisma } from '@prisma/client';
import * as cheerio from 'cheerio';
import { IEventProvider } from '../../interfaces/event-provider.interface';
import { resolveViennaVenueCoordinates } from '../../common/constants/vienna-venues';
import { detectIsFree } from '../../common/utils/pricing.util';
import { createViennaDate } from '../../common/utils/time.util';

@Injectable()
export class WardaService implements IEventProvider {
  private readonly logger = new Logger(WardaService.name);
  private readonly listingUrl = 'https://warda.at/events/';

  constructor(private readonly httpService: HttpService) {}

  async fetchEvents(): Promise<Prisma.EventCreateInput[]> {
    try {
      this.logger.log('Fetching curated lifestyle & nightlife events from WARDA (warda.at)...');

      // 1. Fetch main events listing page
      const listingRes = await firstValueFrom(
        this.httpService.get<string>(this.listingUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7',
          },
          timeout: 8000,
        }),
      );

      const $ = cheerio.load(listingRes.data);
      const eventLinks = new Set<string>();

      $('a[href*="/events/"]').each((_, el) => {
        const href = $(el).attr('href');
        if (
          href &&
          href.includes('/events/') &&
          !href.endsWith('/events/') &&
          !href.endsWith('/events') &&
          !href.includes('/events_cat/') &&
          !href.includes('facebook.com') &&
          !href.includes('twitter.com')
        ) {
          const cleanUrl = href.split('?')[0].split('#')[0];
          eventLinks.add(cleanUrl);
        }
      });

      this.logger.log(`Found ${eventLinks.size} unique event links on WARDA.`);

      const now = new Date();
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      const tomorrowEnd = new Date(now);
      tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);
      tomorrowEnd.setHours(23, 59, 59, 999);

      const normalizedEvents: Prisma.EventCreateInput[] = [];

      // 2. Fetch detail pages and extract Schema.org JSON-LD metadata
      for (const detailUrl of Array.from(eventLinks)) {
        await this.sleep(200); // Polite rate limit

        try {
          const detailRes = await firstValueFrom(
            this.httpService.get<string>(detailUrl, {
              headers: {
                'User-Agent':
                  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
              },
              timeout: 6000,
            }),
          );

          const $$ = cheerio.load(detailRes.data);
          let eventData: any = null;

          $$('script[type="application/ld+json"]').each((_, el) => {
            try {
              const parsed = JSON.parse($$(el).html() || '{}');
              if (parsed['@type'] === 'Event') {
                eventData = parsed;
              } else if (Array.isArray(parsed)) {
                const found = parsed.find((item: any) => item['@type'] === 'Event');
                if (found) eventData = found;
              }
            } catch {
              // Ignore invalid JSON-LD scripts
            }
          });

          if (!eventData || !eventData.name || !eventData.startDate) {
            continue;
          }

          const rawTitle = this.decodeHtmlEntities(String(eventData.name).trim());
          const description = eventData.description
            ? this.decodeHtmlEntities(String(eventData.description).trim())
            : null;

          const startTime = this.parseWardaDate(eventData.startDate);
          if (!startTime || isNaN(startTime.getTime())) continue;

          let endTime: Date | null = null;
          if (eventData.endDate) {
            endTime = this.parseWardaDate(eventData.endDate);
          }
          if (!endTime || isNaN(endTime.getTime())) {
            endTime = new Date(startTime.getTime() + 4 * 3600000);
          }

          // Filter: only keep events within rolling 48h active window (today & tomorrow)
          if (startTime > tomorrowEnd || endTime < todayStart) {
            continue;
          }

          // Venue & Coordinates resolution
          const location = eventData.location || {};
          const venueName = String(location.name || 'Wien').trim();
          const venueCoords = resolveViennaVenueCoordinates(venueName);

          const latitude = venueCoords?.lat ?? 48.2082;
          const longitude = venueCoords?.lng ?? 16.3738;

          // Free Entry detection
          const isFree =
            detectIsFree('WARDA', rawTitle, description ?? '') ||
            (description && description.toLowerCase().includes('freie spende')) ||
            false;

          // External identifier
          const slugMatch = detailUrl.match(/\/events\/([^/?#]+)/);
          const slug = slugMatch
            ? slugMatch[1]
            : rawTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-');
          const externalId = `warda-${slug}`;

          normalizedEvents.push({
            externalId,
            provider: 'WARDA',
            title: rawTitle,
            description,
            category: 'Nightlife',
            url: detailUrl,
            imageUrl: null, // Strictly Option 2: 100% risk-free
            startTime,
            endTime,
            venueName,
            latitude,
            longitude,
            isFree: Boolean(isFree),
          });
        } catch (err: any) {
          this.logger.debug(`Failed to parse WARDA event ${detailUrl}: ${err.message}`);
        }
      }

      this.logger.log(
        `Successfully parsed ${normalizedEvents.length} active events (today + tomorrow) from WARDA.`,
      );
      return normalizedEvents;
    } catch (error) {
      this.logger.error('Failed to fetch events from WARDA', error);
      return [];
    }
  }

  /**
   * Parses WARDA date formats such as "20260819T23:00" or "2026-08-19T23:00"
   * into a proper Vienna Date.
   */
  private parseWardaDate(dateStr: string): Date | null {
    if (!dateStr) return null;

    // Pattern 1: YYYYMMDDTHH:mm or YYYYMMDDTH:mm (e.g. "20260819T23:00" or "20260820T4:00")
    const matchCompact = dateStr.match(/^(\d{4})(\d{2})(\d{2})T(\d{1,2}):(\d{2})$/);
    if (matchCompact) {
      const year = parseInt(matchCompact[1], 10);
      const month = parseInt(matchCompact[2], 10);
      const day = parseInt(matchCompact[3], 10);
      const hour = parseInt(matchCompact[4], 10);
      const minute = parseInt(matchCompact[5], 10);
      return createViennaDate(year, month, day, hour, minute);
    }

    // Pattern 2: YYYY-MM-DDTHH:mm
    const matchIso = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{1,2}):(\d{2})/);
    if (matchIso) {
      const year = parseInt(matchIso[1], 10);
      const month = parseInt(matchIso[2], 10);
      const day = parseInt(matchIso[3], 10);
      const hour = parseInt(matchIso[4], 10);
      const minute = parseInt(matchIso[5], 10);
      return createViennaDate(year, month, day, hour, minute);
    }

    // Fallback standard Date parsing
    const parsed = new Date(dateStr);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  private decodeHtmlEntities(str: string): string {
    return str
      .replace(/&#8211;/g, '–')
      .replace(/&#8212;/g, '—')
      .replace(/&#038;/g, '&')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
