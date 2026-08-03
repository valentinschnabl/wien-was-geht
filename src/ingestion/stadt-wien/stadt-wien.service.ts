import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Prisma } from '@prisma/client';
import { IEventProvider } from '../../interfaces/event-provider.interface';

interface StadtWienApiResponse {
  hits?: {
    hits?: StadtWienRawEvent[];
  };
}

interface StadtWienRawEvent {
  _id?: string;
  _source?: StadtWienSource;
}

interface StadtWienSource {
  title?: string;
  short_description?: string | null;
  link?: string | null;
  address?: StadtWienAddress[];
  teaser_event_image?: StadtWienImage[];
  teaser_image?: StadtWienImage[];
  daoh_edit?: {
    logic?: {
      sets?: StadtWienSet[];
    };
  };
}

interface StadtWienAddress {
  addressName?: string | null;
  addressStreet?: string | null;
  location?: {
    coordinates?: [number | string, number | string] | null;
  } | null;
}

interface StadtWienImage {
  url?: string | null;
}

interface StadtWienSet {
  type?: string | null;
  ranges?: StadtWienRange[] | null;
  dates?: StadtWienSchedule[][] | null;
}

interface StadtWienRange {
  from?: string | null;
  to?: string | null;
}

interface StadtWienSchedule {
  from?: string | null;
  to?: string | null;
}

@Injectable()
export class StadtWienService implements IEventProvider {
  private readonly logger = new Logger(StadtWienService.name);
  private readonly endpoint =
    'https://search.wien.gv.at/site_veranstaltungen/_search/template';

  constructor(private readonly httpService: HttpService) {}

  async fetchEvents(): Promise<Prisma.EventCreateInput[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.post<StadtWienApiResponse>(
          this.endpoint,
          {
            id: 'search_template_specific',
            params: {
              event_time: { today: true },
              query_string: '',
              filters: [],
              from: 0,
              size: 1000, // should be plenty for most cases, but can be adjusted if needed
              sort_by: 'daoh_edit.logic.sets.dates.from',
              sort_order: 'asc',
            },
          },
          {
            headers: {
              Accept: 'application/json',
              Authorization: 'ApiKey',
              'Content-Type': 'application/json',
              Origin: 'https://www.wien.gv.at',
              Referer: 'https://www.wien.gv.at/',
            },
          },
        ),
      );

      const rawEvents = response.data?.hits?.hits ?? [];
      this.logger.debug(
        `Extracted ${rawEvents.length} events from Stadt Wien.`,
      );

      return this.normalizeData(rawEvents);
    } catch (error) {
      this.logger.error('Stadt Wien API request failed', error);
      throw error;
    }
  }

  private normalizeData(
    rawEvents: StadtWienRawEvent[],
  ): Prisma.EventCreateInput[] {
    const todayIsoString = new Date().toISOString().split('T')[0];
    const events: Prisma.EventCreateInput[] = [];

    for (const event of rawEvents) {
      const source = event._source;

      if (!source) {
        continue;
      }

      const set = source.daoh_edit?.logic?.sets?.[0];

      if (!set) {
        continue;
      }

      let startTime: Date | null = null;
      let endTime: Date | undefined = undefined;

      if (set.type === 'recurring' && set.ranges && set.ranges.length > 0) {
        // Langzeitveranstaltungen: Übergreifenden Zeitraum erfassen
        const range = set.ranges[0];
        if (range.from) {
          startTime = new Date(range.from);
        }
        if (range.to) {
          // Setzt das Ende auf 23:59:59 lokaler Zeit des letzten Tages
          endTime = new Date(`${range.to}T23:59:59+02:00`);
        }
      } else {
        // Einzelveranstaltungen: Spezifischen Zeitblock für heute suchen
        const rawDates = set.dates ?? [];
        const flatDates = rawDates.flat(2);

        const todaySchedule = flatDates.find((d) =>
          Boolean(d.from && d.from.includes(todayIsoString)),
        );

        const scheduleToUse = todaySchedule ?? flatDates[0];

        if (scheduleToUse?.from) {
          startTime = new Date(scheduleToUse.from);
        }
        if (scheduleToUse?.to) {
          endTime = new Date(scheduleToUse.to);
        }
      }

      // Datensätze ohne jegliche Startzeit verwerfen
      if (!startTime) {
        continue;
      }

      const addressObj = source.address?.[0] ?? {};
      const coordinates = addressObj.location?.coordinates ?? [0, 0];

      const imageObj =
        source.teaser_event_image?.[0] ?? source.teaser_image?.[0];
      const imageUrl = imageObj?.url
        ? `https://www.wien.gv.at${imageObj.url}`
        : null;

      events.push({
        externalId: event._id ?? '',
        provider: 'STADT_WIEN',
        title: source.title ?? 'Untitled event',
        description: source.short_description ?? null,
        category: 'General',
        url: source.link ?? null,
        imageUrl,
        startTime,
        endTime,
        venueName:
          addressObj.addressName ?? addressObj.addressStreet ?? 'Vienna',
        longitude: Number(coordinates[0]),
        latitude: Number(coordinates[1]),
      });
    }

    return events;
  }
}
