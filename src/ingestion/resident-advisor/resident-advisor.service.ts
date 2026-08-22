import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Prisma } from '@prisma/client';
import { IEventProvider } from '../../interfaces/event-provider.interface';
import { resolveViennaVenueCoordinates } from '../../common/constants/vienna-venues';

interface RAEventListing {
  id: string;
  event: {
    id: string;
    title: string;
    startTime: string;
    endTime?: string;
    contentUrl?: string;
    images?: Array<{
      id: string;
      filename: string;
      rawUrl?: string;
      type?: string;
    }>;
    venue?: {
      id: string;
      name: string;
      address?: string;
      latitude?: number;
      longitude?: number;
      location?: {
        latitude?: number;
        longitude?: number;
      };
    };
  };
}

@Injectable()
export class ResidentAdvisorService implements IEventProvider {
  private readonly logger = new Logger(ResidentAdvisorService.name);
  private readonly graphqlEndpoint = 'https://ra.co/graphql';

  constructor(private readonly httpService: HttpService) {}

  async fetchEvents(): Promise<Prisma.EventCreateInput[]> {
    this.logger.log('Fetching Vienna electronic & nightlife events from Resident Advisor...');

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const query = `
      query GET_EVENT_LISTINGS($indices: [IndexType!], $filters: [FilterInput], $pageSize: Int, $page: Int) {
        eventListings(indices: $indices, filters: $filters, pageSize: $pageSize, page: $page) {
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
                rawUrl
                type
              }
              venue {
                id
                name
                address
                latitude
                longitude
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
      indices: ['EVENT'],
      filters: [
        {
          type: 'AREA',
          value: '44', // Area 44 = Vienna / Austria in Resident Advisor GraphQL
        },
        {
          type: 'DATE',
          value: todayStr,
        },
      ],
      pageSize: 40,
      page: 1,
    };

    try {
      const response = await firstValueFrom(
        this.httpService.post<any>(
          this.graphqlEndpoint,
          {
            query,
            variables,
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              Referer: 'https://ra.co/events/at/vienna',
            },
            timeout: 10000,
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

        const startTime = new Date(ev.startTime);
        const endTime = ev.endTime ? new Date(ev.endTime) : null;
        const venueName = ev.venue?.name || 'Wien';

        // Resolve coordinates: try in-memory first, then API coordinates, then Nominatim geocoding
        let lat = ev.venue?.latitude ?? ev.venue?.location?.latitude ?? 0;
        let lng = ev.venue?.longitude ?? ev.venue?.location?.longitude ?? 0;

        const inMemory = resolveViennaVenueCoordinates(ev.venue?.name) || resolveViennaVenueCoordinates(ev.venue?.address);
        if (inMemory) {
          lat = inMemory.lat;
          lng = inMemory.lng;
        } else if (lat === 0 || lng === 0) {
          const address = ev.venue?.address || ev.venue?.name;
          if (address) {
            const coords = await this.geocodeAddress(address);
            lat = coords.lat;
            lng = coords.lng;
          }
        }

        if (isNaN(lat)) lat = 0;
        if (isNaN(lng)) lng = 0;

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
          description: ev.contentUrl ? `Event on Resident Advisor: https://ra.co${ev.contentUrl}` : 'Vienna electronic music event on Resident Advisor.',
          category: 'Nightlife',
          url: eventUrl,
          imageUrl,
          startTime,
          endTime,
          venueName,
          latitude: lat,
          longitude: lng,
          isFree: false,
        });
      }

      this.logger.log(`Normalized ${normalizedEvents.length} events from Resident Advisor for today.`);
      return normalizedEvents;
    } catch (error) {
      this.logger.error('Failed to fetch events from Resident Advisor', error);
      return [];
    }
  }

  private async geocodeAddress(address: string): Promise<{ lat: number; lng: number }> {
    const fastResolved = resolveViennaVenueCoordinates(address);
    if (fastResolved) return fastResolved;

    const query = `${address}, Wien`;
    try {
      const response = await firstValueFrom(
        this.httpService.get<any>('https://nominatim.openstreetmap.org/search', {
          headers: {
            'User-Agent': 'WienWasGehtEventsApp/1.0 (simplyycoding@gmail.com)',
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

    return { lat: 0, lng: 0 };
  }
}
