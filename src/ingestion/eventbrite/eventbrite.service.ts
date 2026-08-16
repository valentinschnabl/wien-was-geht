import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Prisma } from '@prisma/client';
import { IEventProvider } from '../../interfaces/event-provider.interface';

interface EventbriteTag {
  prefix?: string;
  display_name?: string;
  localized?: {
    display_name?: string;
  };
}

interface EventbriteDestinationEvent {
  id?: string;
  name?: string;
  summary?: string | null;
  url?: string | null;
  image_id?: string | null;
  primary_venue_id?: string | null;
  start_date?: string;
  start_time?: string;
  end_date?: string;
  end_time?: string;
  timezone?: string;
  tags?: EventbriteTag[];
}

interface EventbriteDestinationSearchResponse {
  events?: {
    results?: EventbriteDestinationEvent[];
  };
}

interface EventbriteVenueResponse {
  id?: string;
  name?: string;
  latitude?: string;
  longitude?: string;
  address?: {
    address_1?: string;
    city?: string;
    postal_code?: string;
    localized_address_display?: string;
  };
}

interface VenueDetails {
  name: string;
  latitude: number;
  longitude: number;
}

@Injectable()
export class EventbriteService implements IEventProvider {
  private readonly logger = new Logger(EventbriteService.name);
  private readonly searchUrl = 'https://www.eventbriteapi.com/v3/destination/search/';
  private readonly venuesBaseUrl = 'https://www.eventbriteapi.com/v3/venues/';
  private readonly venueCache = new Map<string, VenueDetails>();

  constructor(private readonly httpService: HttpService) {}

  async fetchEvents(): Promise<Prisma.EventCreateInput[]> {
    const token =
      process.env.EVENTBRITE_API_KEY ||
      process.env.EVENTBRITE_TOKEN ||
      'EVENTBRITE_REDACTED_KEY';

    if (!token) {
      this.logger.warn('EVENTBRITE_API_KEY is not defined. Skipping Eventbrite ingestion.');
      return [];
    }

    try {
      this.logger.log('Fetching events from Eventbrite API for Vienna...');

      const response = await firstValueFrom(
        this.httpService.post<EventbriteDestinationSearchResponse>(
          this.searchUrl,
          {
            event_search: {
              dates: 'current_future',
              point_radius: {
                latitude: 48.2082,
                longitude: 16.3738,
                radius: '35km',
              },
              page_size: 100,
            },
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      const rawEvents = response.data?.events?.results ?? [];
      this.logger.log(`Fetched ${rawEvents.length} raw events from Eventbrite around Vienna.`);

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

      const activeEvents = rawEvents.filter((event) => {
        const { start, end } = this.parseDates(event);
        return start <= tomorrowEnd && end >= todayStart;
      });

      this.logger.log(`Filtered to ${activeEvents.length} Eventbrite events active for today and tomorrow.`);

      // Pre-fetch and resolve venues for active events
      const uniqueVenueIds = Array.from(
        new Set(
          activeEvents
            .map((e) => e.primary_venue_id)
            .filter((id): id is string => Boolean(id)),
        ),
      );

      await this.resolveVenues(uniqueVenueIds, token);

      return this.normalizeData(activeEvents);
    } catch (error) {
      this.logger.error('Failed to fetch events from Eventbrite API', error);
      return [];
    }
  }

  private parseDates(event: EventbriteDestinationEvent): { start: Date; end: Date } {
    if (!event.start_date) {
      const now = new Date();
      return { start: now, end: now };
    }

    const startTime = event.start_time || '00:00';
    const endTime = event.end_time || '23:59';
    const endDate = event.end_date || event.start_date;

    const start = new Date(`${event.start_date}T${startTime}:00Z`);
    const end = new Date(`${endDate}T${endTime}:00Z`);

    return { start, end };
  }

  private async resolveVenues(venueIds: string[], token: string): Promise<void> {
    for (const venueId of venueIds) {
      if (this.venueCache.has(venueId)) {
        continue;
      }

      try {
        const res = await firstValueFrom(
          this.httpService.get<EventbriteVenueResponse>(
            `${this.venuesBaseUrl}${venueId}/`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            },
          ),
        );

        const v = res.data;
        const lat = v.latitude ? parseFloat(v.latitude) : 48.2082;
        const lng = v.longitude ? parseFloat(v.longitude) : 16.3738;
        const name =
          v.name ||
          v.address?.localized_address_display ||
          v.address?.address_1 ||
          'Vienna';

        this.venueCache.set(venueId, {
          name,
          latitude: isNaN(lat) ? 48.2082 : lat,
          longitude: isNaN(lng) ? 16.3738 : lng,
        });
      } catch (err) {
        this.logger.debug(`Could not resolve venue ${venueId}: ${(err as Error).message}`);
        this.venueCache.set(venueId, {
          name: 'Vienna',
          latitude: 48.2082,
          longitude: 16.3738,
        });
      }
    }
  }

  private normalizeData(
    rawEvents: EventbriteDestinationEvent[],
  ): Prisma.EventCreateInput[] {
    const events: Prisma.EventCreateInput[] = [];

    for (const event of rawEvents) {
      if (!event.id || !event.name) {
        continue;
      }

      const { start, end } = this.parseDates(event);

      // Venue lookup
      let venueName = 'Vienna';
      let latitude = 48.2082;
      let longitude = 16.3738;

      if (event.primary_venue_id && this.venueCache.has(event.primary_venue_id)) {
        const venue = this.venueCache.get(event.primary_venue_id)!;
        venueName = venue.name;
        latitude = venue.latitude;
        longitude = venue.longitude;
      }

      // Category lookup from tags
      const categoryTag = event.tags?.find(
        (t) => t.prefix === 'EventbriteCategory' || t.prefix === 'EventbriteSubCategory',
      );
      const category =
        categoryTag?.localized?.display_name ||
        categoryTag?.display_name ||
        'Culture';

      // Image URL
      const imageUrl = event.image_id
        ? `https://img.evbuc.com/https%3A%2F%2Fcdn.evbuc.com%2Fimages%2F${event.image_id}%2F1%2Foriginal.jpg?w=800&auto=format%2Ccompress&q=75&sharp=10`
        : null;

      events.push({
        externalId: event.id,
        provider: 'EVENTBRITE',
        title: event.name,
        description: event.summary ? event.summary.substring(0, 500) : null,
        category,
        url: event.url || null,
        imageUrl,
        startTime: start,
        endTime: end,
        venueName,
        latitude,
        longitude,
      });
    }

    return events;
  }
}
