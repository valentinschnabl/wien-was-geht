import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Prisma } from '@prisma/client';
import * as cheerio from 'cheerio';
import { IEventProvider } from '../../interfaces/event-provider.interface';
import { resolveViennaVenueCoordinates } from '../../common/constants/vienna-venues';
import { detectIsFree } from '../../common/utils/pricing.util';

@Injectable()
export class RausgegangenService implements IEventProvider {
  private readonly logger = new Logger(RausgegangenService.name);

  private readonly listingUrls = [
    'https://rausgegangen.com/at/wien/tipps-fuer-heute/?geospatial_query_type=CITY&lat=48.2077&lng=16.3705&city=wien',
    'https://rausgegangen.com/at/wien/tipps-fuer-morgen/?geospatial_query_type=CITY&lat=48.2077&lng=16.3705&city=wien',
  ];

  constructor(private readonly httpService: HttpService) {}

  async fetchEvents(): Promise<Prisma.EventCreateInput[]> {
    try {
      this.logger.log('Fetching curated event tips from Rausgegangen Wien...');

      // 1. Collect event detail links from today and tomorrow listing pages
      const eventLinks = new Set<string>();

      for (const listingUrl of this.listingUrls) {
        try {
          const response = await firstValueFrom(
            this.httpService.get<string>(listingUrl, {
              headers: {
                'User-Agent':
                  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                Accept:
                  'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7',
              },
              timeout: 8000,
            }),
          );

          const $ = cheerio.load(response.data);
          $('a.event-tile, a[href*="/events/"]').each((_, el) => {
            const href = $(el).attr('href');
            if (href && href.includes('/events/')) {
              const fullUrl = href.startsWith('http')
                ? href
                : `https://rausgegangen.com${href.startsWith('/') ? '' : '/'}${href}`;
              eventLinks.add(fullUrl);
            }
          });
        } catch (err: any) {
          this.logger.warn(
            `Failed to fetch listing page ${listingUrl}: ${err.message}`,
          );
        }
      }

      this.logger.log(
        `Found ${eventLinks.size} unique event links from Rausgegangen Wien.`,
      );

      // 2. Fetch detail pages and extract Schema.org JSON-LD metadata
      const normalizedEvents: Prisma.EventCreateInput[] = [];

      for (const detailUrl of Array.from(eventLinks)) {
        await this.sleep(250); // Polite rate limit

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
                const found = parsed.find(
                  (item: any) => item['@type'] === 'Event',
                );
                if (found) eventData = found;
              }
            } catch {
              // Ignore invalid JSON-LD scripts
            }
          });

          if (!eventData || !eventData.name || !eventData.startDate) {
            continue;
          }

          const rawTitle = String(eventData.name).trim();
          const description = eventData.description
            ? String(eventData.description).trim()
            : null;

          const startTime = new Date(eventData.startDate);
          if (isNaN(startTime.getTime())) continue;

          let endTime: Date | null = null;
          if (eventData.endDate) {
            const parsedEnd = new Date(eventData.endDate);
            if (!isNaN(parsedEnd.getTime())) {
              endTime = parsedEnd;
            }
          }
          if (!endTime) {
            endTime = new Date(startTime.getTime() + 3 * 3600000);
          }

          // Venue & Coordinates resolution
          const location = eventData.location || {};
          const venueName = String(location.name || 'Wien').trim();
          const venueCoords = resolveViennaVenueCoordinates(venueName);

          const latitude = venueCoords?.lat ?? 0;
          const longitude = venueCoords?.lng ?? 0;

          // Free Entry detection
          const priceOffer = eventData.offers?.price;
          const isFree =
            priceOffer === 0 ||
            detectIsFree('RAUSGEGANGEN', rawTitle, description ?? '') ||
            false;

          // External URL (Prefer direct ticket/organizer URL if available, fallback to Rausgegangen)
          const targetUrl = eventData.offers?.url || detailUrl;

          // Extract slug or identifier for stable externalId
          const urlSlugMatch = detailUrl.match(/\/events\/([^/?#]+)/);
          const slug = urlSlugMatch
            ? urlSlugMatch[1]
            : rawTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-');
          const externalId = `rausgegangen-${slug}`;

          normalizedEvents.push({
            externalId,
            provider: 'RAUSGEGANGEN',
            title: rawTitle,
            description,
            category: 'Culture',
            url: targetUrl,
            imageUrl: null, // Strictly Option 2: 100% risk-free, no third-party images
            startTime,
            endTime,
            venueName,
            latitude,
            longitude,
            isFree,
          });
        } catch (err: any) {
          this.logger.debug(
            `Failed to parse Rausgegangen event ${detailUrl}: ${err.message}`,
          );
        }
      }

      this.logger.log(
        `Successfully parsed ${normalizedEvents.length} events from Rausgegangen Wien.`,
      );
      return normalizedEvents;
    } catch (error) {
      this.logger.error(
        'Failed to fetch events from Rausgegangen Wien',
        error,
      );
      return [];
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
