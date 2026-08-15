import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Prisma } from '@prisma/client';
import { IEventProvider } from '../../interfaces/event-provider.interface';

interface RaVenue {
  id?: string;
  name?: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  location?: {
    latitude?: number | null;
    longitude?: number | null;
  } | null;
}

interface RaImage {
  id?: string;
  filename?: string;
  type?: string;
}

interface RaEvent {
  id?: string;
  title?: string;
  startTime?: string;
  endTime?: string | null;
  contentUrl?: string;
  images?: RaImage[] | null;
  venue?: RaVenue | null;
}

interface RaEventListingItem {
  id?: string;
  event?: RaEvent;
}

interface RaGraphQLResponse {
  data?: {
    eventListings?: {
      data?: RaEventListingItem[];
      totalResults?: number;
    };
  };
}

@Injectable()
export class ResidentAdvisorService implements IEventProvider {
  private readonly logger = new Logger(ResidentAdvisorService.name);
  private readonly graphqlUrl = 'https://ra.co/graphql';
  private readonly viennaAreaId = 450; // Official Vienna Area ID on Resident Advisor

  constructor(private readonly httpService: HttpService) {}

  async fetchEvents(): Promise<Prisma.EventCreateInput[]> {
    this.logger.log('Fetching Vienna electronic & nightlife events from Resident Advisor...');

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    const query = `
      query GET_EVENT_LISTINGS($filters: FilterInputDtoInput, $pageSize: Int, $page: Int) {
        eventListings(filters: $filters, pageSize: $pageSize, page: $page) {
          data {
            id
            event {
              id
              title
              startTime
              endTime
              contentUrl
              images {
                id
                filename
                type
              }
              venue {
                id
                name
                address
                location {
                  latitude
                  longitude
                }
              }
            }
          }
          totalResults
        }
      }
    `;

    const variables = {
      filters: {
        areas: { eq: this.viennaAreaId },
        listingDate: {
          gte: todayStart.toISOString(),
          lte: todayEnd.toISOString(),
        },
      },
      pageSize: 50,
      page: 1,
    };

    try {
      const response = await firstValueFrom(
        this.httpService.post<RaGraphQLResponse>(
          this.graphqlUrl,
          { query, variables },
          {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Content-Type': 'application/json',
              Referer: 'https://ra.co/events/at/vienna',
              Origin: 'https://ra.co',
            },
          },
        ),
      );

      const items = response.data?.data?.eventListings?.data ?? [];
      this.logger.log(`Fetched ${items.length} raw event listings from Resident Advisor.`);

      const normalizedEvents: Prisma.EventCreateInput[] = [];

      for (const item of items) {
        const ev = item.event;
        if (!ev || !ev.id || !ev.title || !ev.startTime) {
          continue;
        }

        const start = new Date(ev.startTime);
        const end = ev.endTime ? new Date(ev.endTime) : null;

        // Resolve coordinates
        let lat = ev.venue?.latitude ?? ev.venue?.location?.latitude ?? 0;
        let lng = ev.venue?.longitude ?? ev.venue?.location?.longitude ?? 0;

        // If coordinates are missing or 0, fallback to geocoding or central Vienna
        if (lat === 0 || lng === 0) {
          const address = ev.venue?.address || ev.venue?.name;
          if (address) {
            const coords = await this.geocodeAddress(address);
            lat = coords.lat;
            lng = coords.lng;
          }
        }

        if (lat === 0 || isNaN(lat)) lat = 48.2082;
        if (lng === 0 || isNaN(lng)) lng = 16.3738;

        const eventUrl = ev.contentUrl
          ? ev.contentUrl.startsWith('http')
            ? ev.contentUrl
            : `https://ra.co${ev.contentUrl}`
          : 'https://ra.co/events/at/vienna';

        // Extract flyer / cover image from images array
        let imageUrl: string | null = null;
        if (Array.isArray(ev.images) && ev.images.length > 0) {
          const flyer = ev.images.find((img) => img.type === 'FLYERFRONT') || ev.images[0];
          if (flyer?.filename) {
            imageUrl = flyer.filename.startsWith('http')
              ? flyer.filename
              : `https://images.ra.co/images/events/flyer/${flyer.filename}`;
          }
        }

        normalizedEvents.push({
          externalId: `ra-${ev.id}`,
          provider: 'RESIDENT_ADVISOR',
          title: ev.title,
          description: ev.venue?.name
            ? `Live at ${ev.venue.name}${ev.venue.address ? ` (${ev.venue.address})` : ''}`
            : null,
          category: 'Nightlife',
          url: eventUrl,
          imageUrl, // High-res flyer cover image
          startTime: start,
          endTime: end,
          venueName: ev.venue?.name || 'Wien',
          latitude: lat,
          longitude: lng,
        });
      }

      this.logger.log(
        `Normalized ${normalizedEvents.length} events from Resident Advisor for today.`,
      );
      return normalizedEvents;
    } catch (error) {
      this.logger.error('Failed to fetch events from Resident Advisor', error);
      return [];
    }
  }

  private async geocodeAddress(address: string): Promise<{ lat: number; lng: number }> {
    const query = `${address}, Wien`;
    try {
      const response = await firstValueFrom(
        this.httpService.get<any>('https://nominatim.openstreetmap.org/search', {
          headers: {
            'User-Agent': 'WienWasGehtEventsApp/1.0 (valentin.cello@gmail.com)',
          },
          params: {
            q: query,
            format: 'json',
            limit: 1,
          },
          timeout: 4000,
        }),
      );

      const data = response.data;
      if (Array.isArray(data) && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        if (!isNaN(lat) && !isNaN(lng)) {
          return { lat, lng };
        }
      }
    } catch (err) {
      this.logger.debug(`Nominatim lookup failed for "${query}": ${(err as Error).message}`);
    }

    return { lat: 48.2082, lng: 16.3738 };
  }
}
