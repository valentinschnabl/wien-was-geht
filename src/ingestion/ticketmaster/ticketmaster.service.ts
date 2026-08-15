import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Prisma } from '@prisma/client';
import { IEventProvider } from '../../interfaces/event-provider.interface';

interface TicketmasterVenue {
  name?: string;
  postalCode?: string;
  city?: {
    name?: string;
  };
  address?: {
    line1?: string;
  };
  location?: {
    latitude?: string;
    longitude?: string;
  };
}

interface TicketmasterImage {
  url?: string;
  width?: number;
  height?: number;
}

interface TicketmasterClassification {
  primary?: boolean;
  segment?: {
    name?: string;
  };
  genre?: {
    name?: string;
  };
}

interface TicketmasterEvent {
  id?: string;
  name?: string;
  description?: string | null;
  info?: string | null;
  pleaseNote?: string | null;
  url?: string | null;
  images?: TicketmasterImage[];
  dates?: {
    start?: {
      localDate?: string;
      localTime?: string;
      dateTime?: string;
    };
    end?: {
      localDate?: string;
      localTime?: string;
      dateTime?: string;
    };
  };
  classifications?: TicketmasterClassification[];
  _embedded?: {
    venues?: TicketmasterVenue[];
  };
}

interface TicketmasterApiResponse {
  _embedded?: {
    events?: TicketmasterEvent[];
  };
}

@Injectable()
export class TicketmasterService implements IEventProvider {
  private readonly logger = new Logger(TicketmasterService.name);
  private readonly endpoint = 'https://app.ticketmaster.com/discovery/v2/events.json';

  constructor(private readonly httpService: HttpService) {}

  async fetchEvents(): Promise<Prisma.EventCreateInput[]> {
    const apiKey =
      process.env.TICKETMASTER_Consumer_Key ||
      process.env.TICKETMASTER_API_KEY ||
      'TICKETMASTER_REDACTED_KEY';

    try {
      this.logger.log('Fetching events from Ticketmaster API for Austria...');

      const response = await firstValueFrom(
        this.httpService.get<TicketmasterApiResponse>(this.endpoint, {
          params: {
            apikey: apiKey,
            countryCode: 'AT',
            size: 200,
            sort: 'date,asc',
          },
        }),
      );

      const rawEvents = response.data?._embedded?.events ?? [];
      this.logger.log(`Fetched ${rawEvents.length} raw events from Ticketmaster in Austria.`);

      if (rawEvents.length === 0) {
        return [];
      }

      // Filter to Vienna region (within ~35km or city matches Vienna/Wien)
      const viennaEvents = rawEvents.filter((event) => this.isInViennaRegion(event));
      this.logger.log(`Filtered to ${viennaEvents.length} events in Vienna region.`);

      // Filter to events active today
      const now = new Date();
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(now);
      todayEnd.setHours(23, 59, 59, 999);

      const activeTodayEvents = viennaEvents.filter((event) => {
        const { start, end } = this.parseEventDates(event);
        return start <= todayEnd && end >= todayStart;
      });

      this.logger.log(`Filtered to ${activeTodayEvents.length} Ticketmaster events active today.`);

      return this.normalizeData(activeTodayEvents);
    } catch (error) {
      this.logger.error('Failed to fetch events from Ticketmaster API', error);
      return [];
    }
  }

  private isInViennaRegion(event: TicketmasterEvent): boolean {
    const venue = event._embedded?.venues?.[0];
    if (!venue) return false;

    const cityName = (venue.city?.name ?? '').toLowerCase();
    if (cityName.includes('vienna') || cityName.includes('wien')) {
      return true;
    }

    const lat = parseFloat(venue.location?.latitude ?? '');
    const lng = parseFloat(venue.location?.longitude ?? '');
    if (!isNaN(lat) && !isNaN(lng)) {
      // Distance check within ~35km of Vienna center (48.2082, 16.3738)
      const dLat = (lat - 48.2082) * (Math.PI / 180);
      const dLng = (lng - 16.3738) * (Math.PI / 180);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(48.2082 * (Math.PI / 180)) *
          Math.cos(lat * (Math.PI / 180)) *
          Math.sin(dLng / 2) *
          Math.sin(dLng / 2);
      const distKm = 6371 * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
      return distKm <= 35;
    }

    return false;
  }

  private parseEventDates(event: TicketmasterEvent): { start: Date; end: Date } {
    const startDateStr =
      event.dates?.start?.dateTime ||
      (event.dates?.start?.localDate
        ? `${event.dates.start.localDate}T${event.dates.start.localTime || '00:00:00'}Z`
        : null);

    const start = startDateStr ? new Date(startDateStr) : new Date();

    const endDateStr =
      event.dates?.end?.dateTime ||
      (event.dates?.end?.localDate
        ? `${event.dates.end.localDate}T${event.dates.end.localTime || '23:59:59'}Z`
        : null);

    const end = endDateStr ? new Date(endDateStr) : start;

    return { start, end };
  }

  private normalizeData(rawEvents: TicketmasterEvent[]): Prisma.EventCreateInput[] {
    const events: Prisma.EventCreateInput[] = [];

    for (const event of rawEvents) {
      if (!event.id || !event.name) {
        continue;
      }

      const venue = event._embedded?.venues?.[0];
      const latitude = venue?.location?.latitude ? parseFloat(venue.location.latitude) : 0.0;
      const longitude = venue?.location?.longitude ? parseFloat(venue.location.longitude) : 0.0;

      const venueName =
        venue?.name ||
        venue?.address?.line1 ||
        venue?.city?.name ||
        'Vienna';

      const { start, end } = this.parseEventDates(event);

      // Extract best quality image URL
      const imageUrl =
        event.images?.find((img) => (img.width ?? 0) >= 300)?.url ||
        event.images?.[0]?.url ||
        null;

      const category =
        event.classifications?.[0]?.segment?.name ||
        event.classifications?.[0]?.genre?.name ||
        'Music';

      const description =
        event.description || event.info || event.pleaseNote || null;

      events.push({
        externalId: event.id,
        provider: 'TICKETMASTER',
        title: event.name,
        description: description ? description.substring(0, 500) : null,
        category,
        url: event.url || null,
        imageUrl,
        startTime: start,
        endTime: end,
        venueName,
        latitude: isNaN(latitude) ? 0.0 : latitude,
        longitude: isNaN(longitude) ? 0.0 : longitude,
      });
    }

    return events;
  }
}
