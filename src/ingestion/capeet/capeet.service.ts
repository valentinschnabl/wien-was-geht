import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Prisma } from '@prisma/client';
import { IEventProvider } from '../../interfaces/event-provider.interface';
import { applyViennaTime } from '../../common/utils/time.util';
import { resolveViennaVenueCoordinates } from '../../common/constants/vienna-venues';

@Injectable()
export class CapeetService implements IEventProvider {
  private readonly logger = new Logger(CapeetService.name);
  private readonly capeetUrl = 'https://www.capeet.com/gigs_list.html';

  constructor(private readonly httpService: HttpService) {}

  async fetchEvents(targetDate?: Date): Promise<Prisma.EventCreateInput[]> {
    this.logger.log('Fetching Vienna underground and indie concert listings from Capeet...');

    try {
      const response = await firstValueFrom(
        this.httpService.get<string>(this.capeetUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Accept: 'text/html,application/xhtml+xml',
          },
          timeout: 8000,
        }),
      );

      return this.parseHtml(response.data, targetDate);
    } catch (error) {
      this.logger.error('Failed to fetch events from Capeet', error);
      return [];
    }
  }

  public async parseHtml(html: string, targetDate?: Date): Promise<Prisma.EventCreateInput[]> {
    const now = targetDate || new Date();
    const today = new Date(now);
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const pad = (n: number) => String(n).padStart(2, '0');
    const todayPrefix = `${pad(today.getDate())}.${pad(today.getMonth() + 1)}.`;
    const tomorrowPrefix = `${pad(tomorrow.getDate())}.${pad(tomorrow.getMonth() + 1)}.`;

    const lines = html.split('\n');
    const normalizedEvents: Prisma.EventCreateInput[] = [];

    for (const rawLine of lines) {
      const trimmed = rawLine.trim();
      if (!trimmed) continue;
      if (trimmed.toLowerCase().includes('[cancelled') || trimmed.toLowerCase().includes('[abgesagt')) continue;

      let eventDate: Date | null = null;
      let datePrefix = '';

      if (trimmed.startsWith(todayPrefix)) {
        eventDate = today;
        datePrefix = todayPrefix;
      } else if (trimmed.startsWith(tomorrowPrefix)) {
        eventDate = tomorrow;
        datePrefix = tomorrowPrefix;
      }

      if (!eventDate) continue;

      const withoutDate = trimmed.slice(datePrefix.length).trim();
      const atIndex = withoutDate.lastIndexOf('@');
      if (atIndex === -1) continue;

      const bandsHtml = withoutDate.slice(0, atIndex).trim();
      const trailingHtml = withoutDate.slice(atIndex + 1).trim();

      const venueClean = this.stripHtml(trailingHtml).replace(/\[\d{1,2}:\d{2}!?\]/g, '').trim();

      // Filter for Vienna events only
      const isVienna =
        venueClean.toLowerCase().includes('wien') ||
        venueClean.toLowerCase().includes('vienna') ||
        /\b1\d{3}\s+wien\b/i.test(venueClean) ||
        Boolean(resolveViennaVenueCoordinates(venueClean));

      if (!isVienna) continue;

      const title = this.stripHtml(bandsHtml);
      if (!title) continue;

      // Extract direct external link if present (e.g. Bandcamp, Ticket link, Facebook Event)
      const urlMatch =
        trailingHtml.match(/href="([^"]+)"/i) || bandsHtml.match(/href="([^"]+)"/i);
      const url = urlMatch ? urlMatch[1] : this.capeetUrl;

      // Extract custom start time if listed (e.g. [17:00!])
      const timeMatch = trimmed.match(/\[(\d{1,2}:\d{2})!?\]/);
      let startTime: Date;
      if (timeMatch) {
        const [hours, minutes] = timeMatch[1].split(':').map(Number);
        startTime = applyViennaTime(eventDate, hours, minutes);
      } else {
        startTime = applyViennaTime(eventDate, 20, 0);
      }

      const endTime = new Date(startTime.getTime() + 4 * 60 * 60 * 1000); // 4h duration

      // Resolve coordinates
      let lat = 0;
      let lng = 0;

      const resolved = resolveViennaVenueCoordinates(venueClean);
      if (resolved) {
        lat = resolved.lat;
        lng = resolved.lng;
      } else {
        const geo = await this.geocodeAddress(venueClean);
        if (geo.lat !== 0 && geo.lng !== 0) {
          lat = geo.lat;
          lng = geo.lng;
        }
      }

      const month = pad(eventDate.getMonth() + 1);
      const day = pad(eventDate.getDate());
      const externalId = `capeet-${eventDate.getFullYear()}${month}${day}-${this.slugify(title)}-${this.slugify(venueClean)}`;

      normalizedEvents.push({
        externalId,
        provider: 'CAPEET',
        title,
        description: `Live music at ${venueClean}. Source: Capeet Vienna Indie/Underground Concert Calendar.`,
        category: 'Music',
        url,
        imageUrl: null,
        startTime,
        endTime,
        venueName: venueClean,
        latitude: lat,
        longitude: lng,
        isFree: false,
      });
    }

    this.logger.log(`Extracted ${normalizedEvents.length} live concert events from Capeet.`);
    return normalizedEvents;
  }

  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&ouml;/g, 'ö')
      .replace(/&auml;/g, 'ä')
      .replace(/&uuml;/g, 'ü')
      .replace(/&szlig;/g, 'ß')
      .replace(/&Ouml;/g, 'Ö')
      .replace(/&Auml;/g, 'Ä')
      .replace(/&Uuml;/g, 'Ü')
      .replace(/&#381;/g, 'Ž')
      .replace(/&#1053;&#1040;&#1058;&#1040;&#1064;&#1040;/g, 'НАТАША')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 30);
  }

  private async geocodeAddress(address: string): Promise<{ lat: number; lng: number }> {
    const fast = resolveViennaVenueCoordinates(address);
    if (fast) return fast;

    const query = `${address}, Wien`;
    try {
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
          timeout: 4000,
        }),
      );

      const data = response.data;
      if (Array.isArray(data) && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        if (!isNaN(lat) && !isNaN(lng)) {
          return { lat, lng };
        }
      }
    } catch {
      // Ignore and fallback
    }

    return { lat: 0, lng: 0 };
  }
}
