import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Prisma } from '@prisma/client';
import { resolveViennaVenueCoordinates } from '../../common/constants/vienna-venues';

@Injectable()
export class CapeetService {
  private readonly logger = new Logger(CapeetService.name);
  private readonly capeetUrl = 'https://www.capeet.com/gigs_list.html';

  constructor(private readonly httpService: HttpService) {}

  async fetchEvents(targetDate: Date = new Date()): Promise<Prisma.EventCreateInput[]> {
    this.logger.log(`Fetching Vienna underground and indie concert listings from Capeet...`);

    const today = new Date(targetDate);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayPrefix = `${String(today.getDate()).padStart(2, '0')}.${String(today.getMonth() + 1).padStart(2, '0')}.`;
    const tomorrowPrefix = `${String(tomorrow.getDate()).padStart(2, '0')}.${String(tomorrow.getMonth() + 1).padStart(2, '0')}.`;

    try {
      const response = await firstValueFrom(
        this.httpService.get<string>(this.capeetUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
          responseType: 'text',
          timeout: 10000,
        }),
      );

      const html = response.data;
      if (!html || typeof html !== 'string') {
        this.logger.warn('Received empty response from Capeet.');
        return [];
      }

      const lines = html.split(/<br\s*\/?>/i);
      const normalizedEvents: Prisma.EventCreateInput[] = [];

      // Regex matching entries like:
      // 16.08.: <b><a href="...">BAND</a> / BAND2</b> @ <i>Arena-Beisl, Wien</i> <a href="...">[fb]</a>
      const lineRegex = /^(\d{2})\.(\d{2})\.:\s*<b>(.*?)<\/b>\s*@\s*<i>(.*?)<\/i>(.*)$/is;

      for (const rawLine of lines) {
        const trimmed = rawLine.trim();
        if (!trimmed.includes('@') || !trimmed.includes('<b>')) continue;

        // Skip cancelled concerts
        if (
          trimmed.toLowerCase().includes('[cancelled') ||
          trimmed.toLowerCase().includes('abgesagt') ||
          trimmed.toLowerCase().includes('[postponed')
        ) {
          continue;
        }

        const match = trimmed.match(lineRegex);
        if (!match) continue;

        const [, day, month, bandsHtml, venueRaw, trailingHtml] = match;
        const entryDatePrefix = `${day}.${month}.`;

        // Check if event is on today or tomorrow
        let eventDate: Date | null = null;
        if (entryDatePrefix === todayPrefix) {
          eventDate = new Date(today);
        } else if (entryDatePrefix === tomorrowPrefix) {
          eventDate = new Date(tomorrow);
        } else {
          continue;
        }

        const venueClean = this.stripHtml(venueRaw);

        // Filter for Vienna events only
        const isVienna =
          venueClean.toLowerCase().includes('wien') ||
          venueClean.toLowerCase().includes('vienna') ||
          /\b1\d{3}\s+wien\b/i.test(venueClean);

        if (!isVienna) continue;

        const title = this.stripHtml(bandsHtml);
        if (!title) continue;

        // Extract direct external link if present (e.g. Bandcamp, Ticket link, Facebook Event)
        const urlMatch =
          trailingHtml.match(/href="([^"]+)"/i) || bandsHtml.match(/href="([^"]+)"/i);
        const url = urlMatch ? urlMatch[1] : this.capeetUrl;

        // Extract custom start time if listed (e.g. [17:00!])
        const timeMatch = trimmed.match(/\[(\d{1,2}:\d{2})!?\]/);
        const startTime = new Date(eventDate);
        if (timeMatch) {
          const [hours, minutes] = timeMatch[1].split(':').map(Number);
          startTime.setHours(hours, minutes, 0, 0);
        } else {
          // Default Vienna live gig doors / start time
          startTime.setHours(20, 0, 0, 0);
        }

        const endTime = new Date(startTime.getTime() + 4 * 60 * 60 * 1000); // 4h duration

        // Resolve coordinates
        let lat = 48.2082;
        let lng = 16.3738;

        const resolved = resolveViennaVenueCoordinates(venueClean);
        if (resolved) {
          lat = resolved.lat;
          lng = resolved.lng;
        } else {
          // Geocode via Nominatim with fallback
          const geo = await this.geocodeAddress(venueClean);
          if (geo.lat !== 0 && geo.lng !== 0) {
            lat = geo.lat;
            lng = geo.lng;
          }
        }

        const externalId = `capeet-${eventDate.getFullYear()}${month}${day}-${this.slugify(title)}-${this.slugify(venueClean)}`;

        normalizedEvents.push({
          externalId,
          provider: 'CAPEET',
          title,
          description: `Live in Concert: ${title} live @ ${venueClean}. Programm via Capeet Gigliste Wien.`,
          category: 'Music',
          url,
          imageUrl: null,
          startTime,
          endTime,
          venueName: venueClean,
          latitude: lat,
          longitude: lng,
        });
      }

      this.logger.log(
        `Extracted ${normalizedEvents.length} live concert events from Capeet for ${todayPrefix} and ${tomorrowPrefix}.`,
      );
      return normalizedEvents;
    } catch (error) {
      this.logger.error('Failed to fetch events from Capeet', error);
      return [];
    }
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
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40);
  }

  private async geocodeAddress(query: string): Promise<{ lat: number; lng: number }> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<any>('https://nominatim.openstreetmap.org/search', {
          headers: {
            'User-Agent': 'WienWasGehtEventsApp/1.0 (simplyycoding@gmail.com)',
          },
          params: {
            q: `${query}, Wien`,
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

    return { lat: 48.2082, lng: 16.3738 };
  }
}
