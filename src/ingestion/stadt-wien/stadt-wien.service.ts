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
  price_teaser_string?: string | null;
  price?: {
    fixedPrice?: number | null;
    priceRichText?: string | null;
  } | null;
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
    const headers = {
      Accept: 'application/json',
      Authorization: 'ApiKey',
      'Content-Type': 'application/json',
      Origin: 'https://www.wien.gv.at',
      Referer: 'https://www.wien.gv.at/',
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    };

    try {
      this.logger.log('Fetching Stadt Wien events for today and tomorrow...');

      const [todayResponse, tomorrowResponse] = await Promise.all([
        firstValueFrom(
          this.httpService.post<StadtWienApiResponse>(
            this.endpoint,
            {
              id: 'search_template_specific',
              params: {
                event_time: { today: true },
                query_string: '',
                filters: [],
                from: 0,
                size: 1000,
                sort_by: 'daoh_edit.logic.sets.dates.from',
                sort_order: 'asc',
              },
            },
            { headers },
          ),
        ).catch((err) => {
          this.logger.warn('Failed to fetch today events from Stadt Wien', err);
          return { data: { hits: { hits: [] } } };
        }),
        firstValueFrom(
          this.httpService.post<StadtWienApiResponse>(
            this.endpoint,
            {
              id: 'search_template_specific',
              params: {
                event_time: { tomorrow: true },
                query_string: '',
                filters: [],
                from: 0,
                size: 1000,
                sort_by: 'daoh_edit.logic.sets.dates.from',
                sort_order: 'asc',
              },
            },
            { headers },
          ),
        ).catch((err) => {
          this.logger.warn('Failed to fetch tomorrow events from Stadt Wien', err);
          return { data: { hits: { hits: [] } } };
        }),
      ]);

      const todayHits = todayResponse.data?.hits?.hits ?? [];
      const tomorrowHits = tomorrowResponse.data?.hits?.hits ?? [];

      // Merge and deduplicate by _id
      const hitMap = new Map<string, StadtWienRawEvent>();
      [...todayHits, ...tomorrowHits].forEach((hit) => {
        const id = hit._id || hit._source?.title || '';
        if (id && !hitMap.has(id)) {
          hitMap.set(id, hit);
        }
      });

      const rawEvents = Array.from(hitMap.values());
      this.logger.log(
        `Extracted ${rawEvents.length} distinct events (today + tomorrow) from Stadt Wien.`,
      );

      return this.normalizeData(rawEvents);
    } catch (error) {
      this.logger.error('Stadt Wien API request failed', error);
      return [];
    }
  }

  private normalizeData(
    rawEvents: StadtWienRawEvent[],
  ): Prisma.EventCreateInput[] {
    const now = new Date();
    const todayIsoString = now.toISOString().split('T')[0];
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowIsoString = tomorrow.toISOString().split('T')[0];

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
        // Einzelveranstaltungen: Spezifischen Zeitblock für heute oder morgen suchen
        const rawDates = set.dates ?? [];
        const flatDates = rawDates.flat(2);

        for (const date of flatDates) {
          if (!date.from) {
            continue;
          }

          if (
            date.from.startsWith(todayIsoString) ||
            date.from.startsWith(tomorrowIsoString)
          ) {
            startTime = new Date(date.from);
            if (date.to) {
              endTime = new Date(date.to);
            }
            break;
          }
        }

        // Fallback wenn vorhanden
        if (!startTime && flatDates.length > 0 && flatDates[0].from) {
          startTime = new Date(flatDates[0].from);
          if (flatDates[0].to) {
            endTime = new Date(flatDates[0].to);
          }
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
        ? imageObj.url.startsWith('http')
          ? imageObj.url
          : `https://www.wien.gv.at${imageObj.url}`
        : null;

      const isFree =
        source.price_teaser_string?.toLowerCase().includes('gratis') ||
        source.price?.fixedPrice === 0;
      const isPaid =
        typeof source.price?.fixedPrice === 'number' && source.price.fixedPrice > 0;

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
        isFree: isFree ? true : isPaid ? false : undefined,
      });
    }

    return events;
  }
}
