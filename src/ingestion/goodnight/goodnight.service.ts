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
      const todayStr = new Date().toLocaleDateString('sv-SE'); // YYYY-MM-DD
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

      const rawEvents = days[0].events ?? [];
      this.logger.log(`Fetched ${rawEvents.length} raw curated events from Goodnight.at.`);

      const normalizedEvents: Prisma.EventCreateInput[] = [];

      for (const event of rawEvents) {
        if (!event.id || !event.title) {
          continue;
        }

        // Parse start and end time
        const startDateStr = event.event_date?.start || todayStr;
        const timeStartStr = event.time_start || '00:00';
        const startTime = new Date(`${startDateStr}T${timeStartStr}:00+02:00`);

        let endTime: Date | null = null;
        if (event.event_date?.end && event.time_end) {
          endTime = new Date(`${event.event_date.end}T${event.time_end}:00+02:00`);
        }

        // Address and venue resolution
        const address = event.location?.address;
        const venueTitle = event.location?.title;
        let latitude = 48.2082;
        let longitude = 16.3738;

        const street = address?.street;
        const city = address?.city || 'Wien';
        const zipCode = address?.zip_code;

        if (street || venueTitle) {
          // 1s delay to comply with OpenStreetMap Nominatim usage policy
          await this.sleep(1000);
          const coords = await this.geocodeAddress(street, city, zipCode, venueTitle);
          if (coords.lat !== 0 && coords.lng !== 0) {
            latitude = coords.lat;
            longitude = coords.lng;
          }
        }

        normalizedEvents.push({
          externalId: `goodnight-${event.id}`,
          provider: 'GOODNIGHT',
          title: event.title,
          description: event.teaser_text ?? null,
          category: event.category?.title || 'Culture',
          url: event.event_link || (event.slug ? `https://goodnight.at/events/${event.slug}` : 'https://goodnight.at/events'),
          imageUrl: null, // Strictly null: no pictures from Goodnight as requested
          startTime,
          endTime,
          venueName: venueTitle || street || 'Wien',
          latitude,
          longitude,
        });
      }

      return normalizedEvents;
    } catch (error) {
      this.logger.error('Failed to fetch events from Goodnight.at', error);
      return [];
    }
  }

  private async geocodeAddress(
    street: string | null | undefined,
    city: string | null | undefined,
    zipCode: string | number | null | undefined,
    venueTitle: string | null | undefined,
  ): Promise<{ lat: number; lng: number }> {
    const streetClean = street && street !== 'undefined' ? street : '';
    const cityClean = city && city !== 'undefined' ? city : 'Wien';
    const zipClean = zipCode && zipCode !== 'undefined' ? zipCode : '';

    const queryParts = [streetClean, zipClean, cityClean].filter(Boolean);
    let query = queryParts.join(', ');

    if (!streetClean && venueTitle) {
      query = `${venueTitle}, Wien`;
    }

    if (!query) {
      return { lat: 0.0, lng: 0.0 };
    }

    // Fast in-memory lookup for prominent Vienna nightlife and event venues
    const venueLookup = (venueTitle || streetClean).toLowerCase();
    const knownVenues: Record<string, { lat: number; lng: number }> = {
      pratersauna: { lat: 48.2132, lng: 16.4024 },
      'das werk': { lat: 48.2346, lng: 16.3582 },
      werk: { lat: 48.2346, lng: 16.3582 },
      fluc: { lat: 48.2173, lng: 16.3905 },
      'fluc wanne': { lat: 48.2173, lng: 16.3905 },
      sass: { lat: 48.2007, lng: 16.3688 },
      'sass music club': { lat: 48.2007, lng: 16.3688 },
      flex: { lat: 48.2185, lng: 16.3705 },
      'grelle forelle': { lat: 48.2355, lng: 16.3575 },
      volksgarten: { lat: 48.2065, lng: 16.3615 },
      prst: { lat: 48.2195, lng: 16.3945 },
      'porgy & bess': { lat: 48.2052, lng: 16.3742 },
      chelsea: { lat: 48.2155, lng: 16.3425 },
      b72: { lat: 48.2175, lng: 16.3455 },
      arena: { lat: 48.1883, lng: 16.4136 },
      gasometer: { lat: 48.1852, lng: 16.4208 },
      stadthalle: { lat: 48.2019, lng: 16.3376 },
    };

    for (const [key, coords] of Object.entries(knownVenues)) {
      if (venueLookup.includes(key)) {
        return coords;
      }
    }

    try {
      this.logger.debug(`Geocoding Goodnight venue: "${query}" via Nominatim...`);
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
          timeout: 5000,
        }),
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
      this.logger.warn(`Geocoding failed for "${query}". Falling back to default.`);
    }

    return { lat: 0.0, lng: 0.0 };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
