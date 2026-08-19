import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as cheerio from 'cheerio';
import { Prisma } from '@prisma/client';
import { IEventProvider } from '../../interfaces/event-provider.interface';
import { resolveViennaVenueCoordinates } from '../../common/constants/vienna-venues';
import { detectIsFree } from '../../common/utils/pricing.util';

interface LumaEventItem {
  api_id?: string;
  event?: {
    api_id?: string;
    name?: string;
    url?: string;
    description?: string | null;
    start_at?: string;
    end_at?: string | null;
    timezone?: string;
    cover_url?: string | null;
    geo_address_info?: {
      address?: string | null;
      full_address?: string | null;
      short_address?: string | null;
      city?: string | null;
      country?: string | null;
      place_coordinate?: {
        latitude?: number | null;
        longitude?: number | null;
      } | null;
      localized?: {
        de?: {
          address?: string | null;
          full_address?: string | null;
          short_address?: string | null;
        };
      } | null;
    } | null;
    ticket_info?: {
      is_free?: boolean;
      price?: number | null;
      currency?: string | null;
    } | null;
    is_free?: boolean;
  };
}

@Injectable()
export class LumaService implements IEventProvider {
  private readonly logger = new Logger(LumaService.name);
  private readonly viennaUrl = 'https://lu.ma/vienna';

  constructor(private readonly httpService: HttpService) {}

  async fetchEvents(): Promise<Prisma.EventCreateInput[]> {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const tomorrowEnd = new Date(now);
    tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);
    tomorrowEnd.setHours(23, 59, 59, 999);

    try {
      this.logger.log('Fetching popular tech, cultural, and community events from Luma Vienna...');
      const response = await firstValueFrom(
        this.httpService.get<string>(this.viennaUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8',
          },
          timeout: 15000,
        }),
      );

      const $ = cheerio.load(response.data);
      const nextDataRaw = $('#__NEXT_DATA__').html();
      if (!nextDataRaw) {
        this.logger.warn('Could not locate __NEXT_DATA__ script on lu.ma/vienna');
        return [];
      }

      const nextData = JSON.parse(nextDataRaw);
      const rawEvents: LumaEventItem[] =
        nextData.props?.pageProps?.initialData?.data?.events || [];

      this.logger.log(`Found ${rawEvents.length} raw events on Luma Vienna.`);

      const normalizedEvents: Prisma.EventCreateInput[] = [];

      for (const item of rawEvents) {
        const ev = item.event;
        if (!ev || !ev.api_id || !ev.name || !ev.start_at) {
          continue;
        }

        const startTime = new Date(ev.start_at);
        if (isNaN(startTime.getTime())) {
          continue;
        }

        let endTime: Date | null = null;
        if (ev.end_at) {
          const parsedEnd = new Date(ev.end_at);
          if (!isNaN(parsedEnd.getTime())) {
            endTime = parsedEnd;
          }
        }

        // Active check for today and tomorrow
        const effectiveEnd = endTime || startTime;
        if (effectiveEnd < todayStart || startTime > tomorrowEnd) {
          continue;
        }

        // Location & Coordinate resolution
        const geo = ev.geo_address_info;
        const venueName =
          geo?.localized?.de?.address ||
          geo?.address ||
          geo?.localized?.de?.short_address ||
          geo?.short_address ||
          'Wien';

        let latitude = geo?.place_coordinate?.latitude ?? 0;
        let longitude = geo?.place_coordinate?.longitude ?? 0;

        // Fallback to in-memory lookup if coordinates missing or invalid
        if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
          const resolved = resolveViennaVenueCoordinates(venueName);
          if (resolved) {
            latitude = resolved.lat;
            longitude = resolved.lng;
          } else {
            latitude = 48.2082;
            longitude = 16.3738;
          }
        }

        // Price / isFree resolution
        let isFree: boolean | undefined = undefined;
        if (typeof ev.is_free === 'boolean') {
          isFree = ev.is_free;
        } else if (typeof ev.ticket_info?.is_free === 'boolean') {
          isFree = ev.ticket_info.is_free;
        } else if (typeof ev.ticket_info?.price === 'number') {
          isFree = ev.ticket_info.price === 0;
        } else {
          const detected = detectIsFree('LUMA', ev.name, ev.description || '');
          if (detected !== null) {
            isFree = detected;
          }
        }

        const url = ev.url
          ? ev.url.startsWith('http')
            ? ev.url
            : `https://lu.ma/${ev.url}`
          : `https://lu.ma/vienna`;

        normalizedEvents.push({
          externalId: `luma-${ev.api_id}`,
          provider: 'LUMA',
          title: ev.name,
          description: ev.description ? ev.description.substring(0, 500) : null,
          category: 'Culture',
          url,
          imageUrl: null, // Strictly Option 2: 100% risk-free
          startTime,
          endTime,
          venueName,
          latitude,
          longitude,
          isFree,
        });
      }

      this.logger.log(
        `Extracted ${normalizedEvents.length} active events (today + tomorrow) from Luma Vienna.`,
      );
      return normalizedEvents;
    } catch (error) {
      this.logger.error('Failed to fetch events from Luma Vienna', error);
      return [];
    }
  }
}
