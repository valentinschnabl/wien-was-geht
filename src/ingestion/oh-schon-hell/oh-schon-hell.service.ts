import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Prisma } from '@prisma/client';
import { resolveViennaVenueCoordinates } from '../../common/constants/vienna-venues';
import { createViennaDate } from '../../common/utils/time.util';

export interface OhSchonHellRawEvent {
  event_id: number;
  date: string; // YYYY-MM-DD
  event_time?: string; // HH:mm
  show_date?: string; // DD.MM.YYYY
  name?: string;
  title?: string;
  lineup?: string;
  location_name?: string;
  location_id?: number;
  location_city?: string;
  event_post?: string;
  event_latitude?: string | number;
  event_longitude?: string | number;
  event_address?: string;
  event_postal_code?: string;
  event_city?: string;
}

export interface OhSchonHellDay {
  day_name?: string;
  timestamp?: number;
  show_date?: string;
  events?: OhSchonHellRawEvent[];
}

export interface OhSchonHellApiResponse {
  days?: OhSchonHellDay[];
  locations?: Record<string, any>;
}

@Injectable()
export class OhSchonHellService {
  private readonly logger = new Logger(OhSchonHellService.name);
  private readonly endpoint = 'https://ohschonhell.at/ajax/data_cache_db.php';

  constructor(private readonly httpService: HttpService) {}

  async fetchEvents(targetDate: Date = new Date()): Promise<Prisma.EventCreateInput[]> {
    this.logger.log('Fetching Vienna electronic & clubbing events from ohschonhell.at...');

    const today = new Date(targetDate);
    const todayStr = today.toLocaleDateString('sv-SE'); // YYYY-MM-DD
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toLocaleDateString('sv-SE');

    try {
      const response = await firstValueFrom(
        this.httpService.get<OhSchonHellApiResponse>(this.endpoint, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Referer: 'https://ohschonhell.at/',
            'X-Requested-With': 'XMLHttpRequest',
            Accept: 'application/json',
          },
          params: {
            load: 'initial',
            osh_page: 'wien',
          },
          timeout: 10000,
        }),
      );

      const days = response.data?.days ?? [];
      if (!Array.isArray(days) || days.length === 0) {
        this.logger.warn('No days data returned from ohschonhell.at');
        return [];
      }

      // Collect all events for today and tomorrow
      const rawEvents: OhSchonHellRawEvent[] = [];
      const eventIdSet = new Set<number>();

      for (const day of days) {
        for (const ev of day.events ?? []) {
          if (!ev.event_id || eventIdSet.has(ev.event_id)) {
            continue;
          }

          // Check if the event date matches today or tomorrow
          if (ev.date === todayStr || ev.date === tomorrowStr) {
            eventIdSet.add(ev.event_id);
            rawEvents.push(ev);
          }
        }
      }

      this.logger.log(
        `Found ${rawEvents.length} raw events on ohschonhell.at for ${todayStr} and ${tomorrowStr}.`,
      );

      return this.normalizeData(rawEvents, todayStr, tomorrowStr);
    } catch (error) {
      this.logger.error('Failed to fetch events from ohschonhell.at', error);
      return [];
    }
  }

  private normalizeData(
    rawEvents: OhSchonHellRawEvent[],
    todayStr: string,
    tomorrowStr: string,
  ): Prisma.EventCreateInput[] {
    const normalizedEvents: Prisma.EventCreateInput[] = [];

    for (const ev of rawEvents) {
      const title = (ev.name || ev.title || 'Club Night').trim();
      const venueName = (ev.location_name || 'Vienna').trim();

      // Parse start time (defaulting to 22:00 CEST if time is missing)
      const dateStr = ev.date || todayStr;
      const timeStr = ev.event_time && /^\d{1,2}:\d{2}$/.test(ev.event_time)
        ? ev.event_time
        : '22:00';
      const startTime = createViennaDate(dateStr, timeStr);

      // Club nights typically run 6 hours into next morning
      const endTime = new Date(startTime.getTime() + 6 * 60 * 60 * 1000);

      // Resolve coordinates
      let lat = ev.event_latitude ? parseFloat(String(ev.event_latitude)) : 0;
      let lng = ev.event_longitude ? parseFloat(String(ev.event_longitude)) : 0;

      if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) {
        const coords = resolveViennaVenueCoordinates(venueName);
        lat = coords.lat;
        lng = coords.lng;
      }

      // Proximity check: Must be located in Vienna region
      if (!this.isInViennaRegion(lat, lng)) {
        continue;
      }

      // Clean description: strip SoundCloud iframes, HTML tags and decode entities
      let description: string | null = null;
      if (ev.lineup) {
        const cleanLineup = ev.lineup
          .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/<[^>]+>/g, '')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .trim();

        if (cleanLineup.length > 0) {
          description = cleanLineup.substring(0, 500);
        }
      }

      const url = ev.event_post
        ? ev.event_post.startsWith('http')
          ? ev.event_post
          : `https://ohschonhell.at${ev.event_post}`
        : 'https://ohschonhell.at/';

      normalizedEvents.push({
        externalId: `osh-${ev.event_id}`,
        provider: 'OH_SCHON_HELL',
        title,
        description,
        category: 'Nightlife',
        url,
        imageUrl: null, // Strictly no external picture storage
        startTime,
        endTime,
        venueName,
        latitude: lat,
        longitude: lng,
      });
    }

    return normalizedEvents;
  }

  private isInViennaRegion(lat: number, lng: number): boolean {
    if (lat === 0 && lng === 0) return true; // Will fallback to Vienna center
    // Vienna bounding box ~35km
    return lat >= 48.0 && lat <= 48.4 && lng >= 16.1 && lng <= 16.6;
  }
}
