import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Prisma } from '@prisma/client';
import { IEventProvider } from '../../interfaces/event-provider.interface';

interface EventfrogEvent {
  id?: string;
  title?: {
    de?: string | null;
    en?: string | null;
    fr?: string | null;
  } | null;
  url?: string | null;
  organizerName?: string | null;
  websiteUrl?: string | null;
  emblemToShow?: {
    url?: string | null;
  } | null;
  begin?: string | null;
  end?: string | null;
  locationIds?: string[] | null;
  shortDescription?: {
    de?: string | null;
    en?: string | null;
    fr?: string | null;
  } | null;
  locationAlias?: {
    de?: string | null;
    en?: string | null;
    fr?: string | null;
  } | null;
}

interface EventfrogLocation {
  id?: string;
  title?: {
    de?: string | null;
    en?: string | null;
    fr?: string | null;
  } | null;
  addressLine?: string | null;
  country?: string | null;
  zip?: string | null;
  city?: string | null;
  lat?: number | null;
  lng?: number | null;
}

interface EventfrogEventsResponse {
  events?: EventfrogEvent[];
  totalNumberOfResources?: number;
}

interface EventfrogLocationsResponse {
  locations?: EventfrogLocation[];
  totalNumberOfResources?: number;
}

@Injectable()
export class EventfrogService implements IEventProvider {
  private readonly logger = new Logger(EventfrogService.name);
  private readonly baseUrl = 'https://api.eventfrog.net/public/v1';

  constructor(private readonly httpService: HttpService) {}

  async fetchEvents(): Promise<Prisma.EventCreateInput[]> {
    const apiKey = process.env.EVENTFROG_API_KEY;
    if (!apiKey) {
      this.logger.warn('EVENTFROG_API_KEY is not defined in environment variables. Skipping Eventfrog ingestion.');
      return [];
    }

    try {
      this.logger.log('Fetching events from Eventfrog around Vienna...');
      const response = await firstValueFrom(
        this.httpService.get<EventfrogEventsResponse>(
          `${this.baseUrl}/events`,
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              Accept: 'application/json',
            },
            params: {
              country: 'AT',
              lat: 48.2082,
              lng: 16.3738,
              r: 35, // 35km radius to cover Vienna metro area
              perPage: 500, // Fetch up to 500 events
            },
          },
        ),
      );

      const rawEvents = response.data?.events ?? [];
      this.logger.log(`Fetched ${rawEvents.length} raw events from Eventfrog.`);

      if (rawEvents.length === 0) {
        return [];
      }

      // Filter to events active today or tomorrow (48h window)
      const now = new Date();
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      const tomorrowEnd = new Date(now);
      tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);
      tomorrowEnd.setHours(23, 59, 59, 999);

      const activeRawEvents = rawEvents.filter((event) => {
        if (!event.begin) return false;
        const start = new Date(event.begin);
        const end = event.end ? new Date(event.end) : start;
        return start <= tomorrowEnd && end >= todayStart;
      });

      this.logger.log(`Filtered to ${activeRawEvents.length} active events for today and tomorrow.`);

      if (activeRawEvents.length === 0) {
        return [];
      }

      // Fetch location details in batch
      const locationIds = Array.from(
        new Set(activeRawEvents.flatMap((e) => e.locationIds ?? [])),
      );

      const locationMap = await this.fetchLocationsBatch(locationIds, apiKey);

      return this.normalizeData(activeRawEvents, locationMap);
    } catch (error) {
      this.logger.error('Failed to fetch events from Eventfrog', error);
      throw error;
    }
  }

  private async fetchLocationsBatch(
    locationIds: string[],
    apiKey: string,
  ): Promise<Map<string, EventfrogLocation>> {
    const locationMap = new Map<string, EventfrogLocation>();
    if (locationIds.length === 0) {
      return locationMap;
    }

    // Chunk IDs to avoid query string length limits (max 50 per batch is safe)
    const chunkSize = 50;
    for (let i = 0; i < locationIds.length; i += chunkSize) {
      const chunk = locationIds.slice(i, i + chunkSize);
      try {
        const queryParams = chunk.map((id) => `id=${id}`).join('&');
        const url = `${this.baseUrl}/locations?${queryParams}`;

        const response = await firstValueFrom(
          this.httpService.get<EventfrogLocationsResponse>(url, {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              Accept: 'application/json',
            },
          }),
        );

        const locations = response.data?.locations ?? [];
        for (const loc of locations) {
          if (loc.id) {
            locationMap.set(loc.id, loc);
          }
        }
      } catch (error) {
        this.logger.error(`Failed to fetch location batch starting at index ${i}`, error);
      }
    }

    return locationMap;
  }

  private normalizeData(
    rawEvents: EventfrogEvent[],
    locationMap: Map<string, EventfrogLocation>,
  ): Prisma.EventCreateInput[] {
    const events: Prisma.EventCreateInput[] = [];

    for (const event of rawEvents) {
      if (!event.id) {
        continue;
      }

      // Extract title (prefer DE, then EN, then first key)
      const title =
        event.title?.de ||
        event.title?.en ||
        event.title?.fr ||
        'Untitled event';

      // Extract description
      const description =
        event.shortDescription?.de ||
        event.shortDescription?.en ||
        event.shortDescription?.fr ||
        null;

      // Extract dates
      let startTime: Date | null = null;
      let endTime: Date | undefined = undefined;

      if (event.begin) {
        startTime = new Date(event.begin);
      }
      if (event.end) {
        endTime = new Date(event.end);
      }

      if (!startTime) {
        continue;
      }

      // Resolve venue info from the locations map
      let venueName = 'Vienna';
      let latitude = 0.0;
      let longitude = 0.0;

      const locId = event.locationIds?.[0];
      if (locId) {
        const loc = locationMap.get(locId);
        if (loc) {
          venueName =
            loc.title?.de ||
            loc.title?.en ||
            loc.addressLine ||
            loc.city ||
            'Vienna';
          latitude = typeof loc.lat === 'number' ? loc.lat : 0.0;
          longitude = typeof loc.lng === 'number' ? loc.lng : 0.0;
        }
      }

      // Check for custom location alias if it exists
      if (event.locationAlias?.de || event.locationAlias?.en) {
        venueName = event.locationAlias.de || event.locationAlias.en || venueName;
      }

      events.push({
        externalId: event.id,
        provider: 'EVENTFROG',
        title,
        description,
        category: 'General',
        url: event.url ?? null,
        imageUrl: event.emblemToShow?.url ?? null,
        startTime,
        endTime,
        venueName,
        latitude,
        longitude,
      });
    }

    return events;
  }
}
