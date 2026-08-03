import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Prisma } from '@prisma/client';
import { IEventProvider } from '../../interfaces/event-provider.interface';

interface OpenWebNinjaApiResponse {
  data?: OpenWebNinjaEvent[];
}

interface OpenWebNinjaEvent {
  event_id?: string;
  name?: string;
  description?: string | null;
  link?: string | null;
  start_time_utc?: string | null;
  end_time_utc?: string | null;
  venue?: {
    latitude?: number | string | null;
    longitude?: number | string | null;
    name?: string | null;
  } | null;
}

@Injectable()
export class OpenwebNinjaService implements IEventProvider {
  private readonly logger = new Logger(OpenwebNinjaService.name);
  private readonly baseUrl =
    'https://api.openwebninja.com/realtime-events-data';

  constructor(private readonly httpService: HttpService) {}

  async fetchEvents(): Promise<Prisma.EventCreateInput[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<OpenWebNinjaApiResponse>(
          `${this.baseUrl}/search-events`,
          {
            params: {
              query: 'Events in Vienna Wien',
              date: 'today',
              city: 'Vienna',
            },
            headers: {
              'x-api-key': process.env.NINJA_API_KEY,
            },
          },
        ),
      );

      const rawEvents = response.data?.data ?? [];

      this.logger.debug(`Found ${rawEvents.length} raw events from Ninja API.`);

      if (rawEvents.length > 0) {
        this.logger.debug(`Sample Event: ${JSON.stringify(rawEvents[0])}`);
      }

      return this.normalizeData(rawEvents);
    } catch (error) {
      this.logger.error('Failed to fetch events from OpenWeb Ninja', error);
      throw error;
    }
  }

  private normalizeData(
    rawEvents: OpenWebNinjaEvent[],
  ): Prisma.EventCreateInput[] {
    const events: Prisma.EventCreateInput[] = [];

    for (const event of rawEvents) {
      const latitude = event.venue?.latitude
        ? Number(event.venue.latitude)
        : 0.0;
      const longitude = event.venue?.longitude
        ? Number(event.venue.longitude)
        : 0.0;
      const venueName = event.venue?.name ?? 'Vienna';

      const formatToISO = (dateString: string | null | undefined) => {
        if (!dateString) {
          return null;
        }

        return new Date(dateString.replace(' ', 'T') + 'Z');
      };

      events.push({
        externalId: event.event_id ?? '',
        provider: 'OPENWEB_NINJA',
        title: event.name ?? 'Untitled event',
        description: event.description ?? null,
        category: 'General',
        url: event.link ?? null,
        startTime: formatToISO(event.start_time_utc) ?? new Date(),
        endTime: formatToISO(event.end_time_utc),
        venueName,
        latitude,
        longitude,
      });
    }

    return events;
  }
}
