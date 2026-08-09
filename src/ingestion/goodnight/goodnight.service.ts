import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Prisma } from '@prisma/client';
import { IEventProvider } from '../../interfaces/event-provider.interface';

interface GoodnightAddress {
  city?: string | null;
  street?: string | null;
  zip_code?: string | number | null;
}

interface GoodnightLocation {
  title?: string | null;
  address?: GoodnightAddress | null;
}

interface GoodnightEvent {
  id?: string;
  title?: string | null;
  teaser_text?: string | null;
  slug?: string | null;
  event_date?: {
    start?: string | null;
    end?: string | null;
  } | null;
  time_start?: string | null;
  time_end?: string | null;
  event_link?: string | null;
  location?: GoodnightLocation | null;
  category?: {
    id?: string | null;
    title?: string | null;
    slug?: string | null;
  } | null;
}

interface GoodnightApiResponse {
  data?: {
    date?: string;
    formatted_date?: string;
    events?: GoodnightEvent[];
  }[];
}

@Injectable()
export class GoodnightService implements IEventProvider {
  private readonly logger = new Logger(GoodnightService.name);
  private readonly endpoint = 'https://goodnight.at/api/grouped-events';

  constructor(private readonly httpService: HttpService) {}

  async fetchEvents(): Promise<Prisma.EventCreateInput[]> {
    try {
      const todayStr = new Date().toLocaleDateString('sv-SE'); // YYYY-MM-DD in local time
      this.logger.log(`Fetching curated events from Goodnight.at for ${todayStr}...`);

      const response = await firstValueFrom(
        this.httpService.get<GoodnightApiResponse>(this.endpoint, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Accept: 'application/json',
          },
          params: {
            date: todayStr,
          },
        }),
      );

      const days = response.data?.data ?? [];
      if (days.length === 0) {
        return [];
      }

      // Extract events from the current day
      const rawEvents = days[0].events ?? [];
      this.logger.log(`Fetched ${rawEvents.length} raw curated events from Goodnight.at.`);

      const normalizedEvents: Prisma.EventCreateInput[] = [];

      for (const event of rawEvents) {
        if (!event.id || !event.title) {
          continue;
        }

        // Parse dates (defaulting to local CEST timezone offset +02:00 for Vienna in summer)
        const startDateStr = event.event_date?.start || todayStr;
        const timeStartStr = event.time_start || '00:00';
        const startTime = new Date(`${startDateStr}T${timeStartStr}:00+02:00`);

        let endTime: Date | null = null;
        if (event.event_date?.end && event.time_end) {
          endTime = new Date(`${event.event_date.end}T${event.time_end}:00+02:00`);
        }

        // Resolve address details and geocode
        const address = event.location?.address;
        let latitude = 0.0;
        let longitude = 0.0;

        if (address) {
          // Delay to respect Nominatim rate limit (1 req/sec)
          await this.sleep(1000);
          const coords = await this.geocodeAddress(
            address.street,
            address.city,
            address.zip_code,
          );
          latitude = coords.lat;
          longitude = coords.lng;
        }

        normalizedEvents.push({
          externalId: event.id,
          provider: 'GOODNIGHT',
          title: event.title,
          description: event.teaser_text ?? null,
          category: event.category?.title || 'General',
          url: event.event_link ?? `https://goodnight.at/events/${event.slug || ''}`,
          imageUrl: null, // Goodnight API does not return images directly in this endpoint
          startTime,
          endTime,
          venueName: event.location?.title || address?.street || 'Wien',
          latitude,
          longitude,
        });
      }

      return normalizedEvents;
    } catch (error) {
      this.logger.error('Failed to fetch events from Goodnight.at', error);
      throw error;
    }
  }

  private async geocodeAddress(
    street: string | null | undefined,
    city: string | null | undefined,
    zipCode: string | number | null | undefined,
  ): Promise<{ lat: number; lng: number }> {
    const streetClean = street && street !== 'undefined' ? street : '';
    const cityClean = city && city !== 'undefined' ? city : 'Wien';
    const zipClean = zipCode && zipCode !== 'undefined' ? zipCode : '';

    if (!streetClean && !cityClean) {
      return { lat: 0.0, lng: 0.0 };
    }

    const queryParts = [streetClean, zipClean, cityClean].filter(Boolean);
    const query = queryParts.join(', ');

    try {
      this.logger.debug(`Geocoding address: "${query}" via Nominatim...`);
      const response = await firstValueFrom(
        this.httpService.get<any>(
          'https://nominatim.openstreetmap.org/search',
          {
            headers: {
              'User-Agent': 'WienWasGehtEventsApp/1.0 (valentin.cello@gmail.com)',
            },
            params: {
              q: query,
              format: 'json',
              limit: 1,
            },
            timeout: 5000,
          },
        ),
      );

      const data = response.data;
      if (Array.isArray(data) && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        if (!isNaN(lat) && !isNaN(lng)) {
          this.logger.debug(`Resolved "${query}" to [${lat}, ${lng}]`);
          return { lat, lng };
        }
      }
    } catch (error) {
      this.logger.warn(`Geocoding failed for address: "${query}". Falling back to (0,0).`);
    }

    return { lat: 0.0, lng: 0.0 };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
