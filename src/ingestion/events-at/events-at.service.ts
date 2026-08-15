import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as cheerio from 'cheerio';
import { Prisma } from '@prisma/client';
import { IEventProvider } from '../../interfaces/event-provider.interface';

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
    const todayStr = new Date().toLocaleDateString('sv-SE'); // YYYY-MM-DD
    this.logger.log(`Fetching events from events.at for ${todayStr}...`);

    try {
      // 1. Fetch calendar page for Vienna
      const response = await firstValueFrom(
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
      );

      const $ = cheerio.load(response.data);
      const eventLinks: string[] = [];

      // Extract unique event detail links
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

      this.logger.log(`Found ${eventLinks.length} potential event links on events.at.`);

      const now = new Date();
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(now);
      todayEnd.setHours(23, 59, 59, 999);

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

          const $d = cheerio.load(detailRes.data);
          let eventData: SchemaOrgEvent | null = null;

          // Parse JSON-LD metadata
          $d('script[type="application/ld+json"]').each((_, scriptEl) => {
            const rawJson = $d(scriptEl).html();
            if (rawJson) {
              try {
                const parsed = JSON.parse(rawJson);
                if (parsed['@type'] === 'Event') {
                  eventData = parsed;
                } else if (Array.isArray(parsed)) {
                  const ev = parsed.find((item) => item['@type'] === 'Event');
                  if (ev) eventData = ev;
                }
              } catch (e) {
                // Ignore parse errors in scripts
              }
            }
          });

          if (!eventData || !eventData.startDate || !eventData.name) {
            continue;
          }

          const startDate = new Date(eventData.startDate);
          const endDate = eventData.endDate ? new Date(eventData.endDate) : startDate;

          // Strict date filter: Must occur today
          if (startDate > todayEnd || endDate < todayStart) {
            continue;
          }

          // Resolve venue, locality and coordinates
          const locationItem = Array.isArray(eventData.location)
            ? eventData.location[0]
            : eventData.location;

          const venueName = locationItem?.name || 'Wien';
          const locality = locationItem?.address?.addressLocality || '';
          let lat = locationItem?.geo?.latitude
            ? parseFloat(String(locationItem.geo.latitude))
            : 48.2082;
          let lng = locationItem?.geo?.longitude
            ? parseFloat(String(locationItem.geo.longitude))
            : 16.3738;

          // Proximity check: Must be in Vienna region (distance <= 35km or locality matches Wien)
          if (!locality.toLowerCase().includes('wien') && !this.isInViennaRegion(lat, lng)) {
            continue;
          }

          if (isNaN(lat)) lat = 48.2082;
          if (isNaN(lng)) lng = 16.3738;

          const slugMatch = url.match(/\/event\/([a-zA-Z0-9_\-]+)/);
          const externalId = slugMatch ? `eventsat-${slugMatch[1]}` : `eventsat-${Date.now()}`;

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
            startTime: startDate,
            endTime: endDate,
            venueName,
            latitude: lat,
            longitude: lng,
          });
        } catch (detailErr) {
          this.logger.debug(`Could not parse event detail at ${url}: ${(detailErr as Error).message}`);
        }
      }

      this.logger.log(`Extracted ${normalizedEvents.length} active events for today from events.at.`);
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
