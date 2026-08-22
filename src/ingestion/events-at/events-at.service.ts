import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as cheerio from 'cheerio';
import { Prisma } from '@prisma/client';
import { IEventProvider } from '../../interfaces/event-provider.interface';
import { resolveViennaVenueCoordinates } from '../../common/constants/vienna-venues';

interface SchemaOrgEvent {
  '@type'?: string;
  name?: string;
  description?: string;
  url?: string;
  startDate?: string;
  endDate?: string;
  location?:
    | {
        name?: string;
        address?: {
          addressLocality?: string;
          streetAddress?: string;
          postalCode?: string;
        };
        geo?: {
          latitude?: string | number;
          longitude?: string | number;
        };
      }
    | Array<{
        name?: string;
        address?: {
          addressLocality?: string;
          streetAddress?: string;
          postalCode?: string;
        };
        geo?: {
          latitude?: string | number;
          longitude?: string | number;
        };
      }>;
}

@Injectable()
export class EventsAtService implements IEventProvider {
  private readonly logger = new Logger(EventsAtService.name);
  private readonly baseUrl = 'https://events.at';
  private readonly calendarUrl = 'https://events.at/calendar/date/30/1';

  constructor(private readonly httpService: HttpService) {}

  async fetchEvents(): Promise<Prisma.EventCreateInput[]> {
    const now = new Date();
    const todayStr = now.toLocaleDateString('sv-SE'); // YYYY-MM-DD
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toLocaleDateString('sv-SE');

    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const tomorrowEnd = new Date(now);
    tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);
    tomorrowEnd.setHours(23, 59, 59, 999);

    this.logger.log(`Fetching events from events.at for ${todayStr} and ${tomorrowStr}...`);

    try {
      // 1. Fetch calendar pages for Vienna (Today & Tomorrow)
      const [todayCalRes, tomorrowCalRes] = await Promise.all([
        firstValueFrom(
          this.httpService.get<string>(this.calendarUrl, {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            },
            params: {
              'state[]': 'Wien',
              date: todayStr,
            },
          }),
        ).catch(() => ({ data: '' })),
        firstValueFrom(
          this.httpService.get<string>(this.calendarUrl, {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            },
            params: {
              'state[]': 'Wien',
              date: tomorrowStr,
            },
          }),
        ).catch(() => ({ data: '' })),
      ]);

      const eventLinks: string[] = [];

      const extractLinks = (html: string) => {
        if (!html) return;
        const $ = cheerio.load(html);
        $('a[href*="/event/"]').each((_, el) => {
          const href = $(el).attr('href');
          if (
            href &&
            !href.includes('/event-empfehlungen') &&
            !href.includes('/calendar') &&
            !href.endsWith('/event')
          ) {
            const fullUrl = href.startsWith('http') ? href : `${this.baseUrl}${href}`;
            if (!eventLinks.includes(fullUrl)) {
              eventLinks.push(fullUrl);
            }
          }
        });
      };

      extractLinks(todayCalRes.data);
      extractLinks(tomorrowCalRes.data);

      this.logger.log(`Found ${eventLinks.length} potential event links (today + tomorrow) on events.at.`);

      const normalizedEvents: Prisma.EventCreateInput[] = [];

      // 2. Inspect detail pages with strict Schema.org date and location verification
      for (const url of eventLinks) {
        await this.sleep(400); // Polite 400ms delay between page requests

        try {
          const detailRes = await firstValueFrom(
            this.httpService.get<string>(url, {
              headers: {
                'User-Agent':
                  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
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
              // Ignore malformed JSON-LD scripts
            }
          });

          if (!eventData || !eventData.name || !eventData.startDate) {
            continue;
          }

          const start = new Date(eventData.startDate);
          const end = eventData.endDate ? new Date(eventData.endDate) : start;

          // Verify event is active within the 48h window (today & tomorrow)
          if (start > tomorrowEnd || end < todayStart) {
            continue;
          }

          // Resolve venue, address and coordinates
          const locationItem = Array.isArray(eventData.location)
            ? eventData.location[0]
            : eventData.location;

          const venueName = locationItem?.name || 'Wien';
          const locality = locationItem?.address?.addressLocality || '';
          const streetAddress = locationItem?.address?.streetAddress || '';
          const postalCode = locationItem?.address?.postalCode || '';

          let lat: number | null = null;
          let lng: number | null = null;

          if (locationItem?.geo?.latitude && locationItem?.geo?.longitude) {
            const parsedLat = parseFloat(String(locationItem.geo.latitude));
            const parsedLng = parseFloat(String(locationItem.geo.longitude));
            if (!isNaN(parsedLat) && !isNaN(parsedLng) && parsedLat !== 0 && parsedLng !== 0) {
              lat = parsedLat;
              lng = parsedLng;
            }
          }

          // In-memory fuzzy dictionary resolution (venue name, full address, street, postal code, title)
          if (lat === null || lng === null) {
            const resolved =
              resolveViennaVenueCoordinates(venueName) ||
              resolveViennaVenueCoordinates(`${streetAddress} ${postalCode} ${locality}`.trim()) ||
              resolveViennaVenueCoordinates(streetAddress) ||
              resolveViennaVenueCoordinates(postalCode) ||
              resolveViennaVenueCoordinates(eventData.name);

            if (resolved) {
              lat = resolved.lat;
              lng = resolved.lng;
            }
          }

          // Fallback if still unresolved
          if (lat === null || lng === null) {
            lat = 0;
            lng = 0;
          }

          // Proximity check: Must be in Vienna region (distance <= 35km or locality matches Wien)
          if (!locality.toLowerCase().includes('wien') && lat !== 0 && !this.isInViennaRegion(lat, lng)) {
            continue;
          }

          const slugMatch = url.match(/\/event\/([a-zA-Z0-9_\-]+)/);
          const externalId = slugMatch ? `eventsat-${slugMatch[1]}` : `eventsat-${Date.now()}`;

          const offers = Array.isArray(eventData.offers) ? eventData.offers[0] : eventData.offers;
          let isFree: boolean | undefined = undefined;
          if (offers && offers.price !== undefined) {
            const priceNum = parseFloat(String(offers.price));
            if (priceNum === 0) {
              isFree = true;
            } else if (!isNaN(priceNum) && priceNum > 0) {
              isFree = false;
            }
          }

          normalizedEvents.push({
            externalId,
            provider: 'EVENTS_AT',
            title: eventData.name,
            description: eventData.description
              ? eventData.description.substring(0, 500)
              : null,
            category: 'Culture',
            url,
            imageUrl: null, // Strictly no pictures stored
            startTime: start,
            endTime: end,
            venueName,
            latitude: lat,
            longitude: lng,
            isFree,
          });
        } catch (detailErr) {
          this.logger.debug(`Could not parse event detail at ${url}: ${(detailErr as Error).message}`);
        }
      }

      this.logger.log(`Extracted ${normalizedEvents.length} active events (today + tomorrow) from events.at.`);
      return normalizedEvents;
    } catch (error) {
      this.logger.error('Failed to fetch events from events.at', error);
      return [];
    }
  }

  private isInViennaRegion(lat: number, lng: number): boolean {
    const viennaLat = 48.2082;
    const viennaLng = 16.3738;
    const dLat = ((lat - viennaLat) * Math.PI) / 180;
    const dLng = ((lng - viennaLng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((viennaLat * Math.PI) / 180) *
        Math.cos((lat * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceKm = 6371 * c;
    return distanceKm <= 35;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
