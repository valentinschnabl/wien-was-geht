import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as cheerio from 'cheerio';
import { Prisma } from '@prisma/client';
import { IEventProvider } from '../../interfaces/event-provider.interface';

@Injectable()
export class FalterService implements IEventProvider {
  private readonly logger = new Logger(FalterService.name);
  private readonly baseUrl = 'https://www.falter.at';

  constructor(private readonly httpService: HttpService) {}

  async fetchEvents(): Promise<Prisma.EventCreateInput[]> {
    try {
      const todayStr = new Date().toLocaleDateString('sv-SE'); // YYYY-MM-DD local time
      const searchUrl = `${this.baseUrl}/events/suche?span=${todayStr}&region=wien`;
      this.logger.log(`Fetching Falter search results from: ${searchUrl}...`);

      const response = await firstValueFrom(
        this.httpService.get<string>(searchUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        }),
      );

      const $ = cheerio.load(response.data);
      const articles = $('#entries article');
      this.logger.log(`Found ${articles.length} events on the first page of Falter.`);

      const normalizedEvents: Prisma.EventCreateInput[] = [];

      // Limit scraping to the first page (usually 16 events) to respect rate limits and keep it fast
      const maxEventsToScrape = Math.min(articles.length, 16);

      for (let i = 0; i < maxEventsToScrape; i++) {
        const article = $(articles[i]);
        const aTag = article.parent().is('a') ? article.parent() : article.find('a');
        let detailUrl = aTag.attr('href') || article.closest('a').attr('href') || '';

        if (detailUrl && !detailUrl.startsWith('http')) {
          detailUrl = `${this.baseUrl}${detailUrl}`;
        }

        const title = article.find('h2').text().trim();
        const venueName = article.find('.tracking-wider').first().text().trim() || 'Wien';
        const timeText = article.find('time').text().trim();
        const category = article.find('li').first().text().trim() || 'General';

        if (!title || !detailUrl) {
          continue;
        }

        // Parse date/times from timeText (e.g. "Sonntag, 09.08.2026 00:00 – 23:59" or "Sonntag, 09.08.2026 19:30")
        const parsedTimes = this.parseFalterTime(timeText, todayStr);

        // Fetch detail page details (Description, Address, Image)
        this.logger.log(`[Falter] Scraping details for "${title}"...`);
        await this.sleep(1000); // 1-second delay between detail page requests
        const details = await this.fetchEventDetails(detailUrl);

        // Geocode the resolved address
        let latitude = 0.0;
        let longitude = 0.0;
        if (details.address) {
          await this.sleep(1000); // 1-second delay for Nominatim geocoder
          const coords = await this.geocodeAddress(details.address);
          latitude = coords.lat;
          longitude = coords.lng;
        }

        // Extract ID from detailUrl (e.g. /event/1068806/...)
        const idMatch = detailUrl.match(/\/event\/(\d+)/);
        const externalId = idMatch ? `falter-${idMatch[1]}` : `falter-${title.replace(/[^a-zA-Z0-9]/g, '')}`;

        normalizedEvents.push({
          externalId,
          provider: 'FALTER',
          title,
          description: details.description || null,
          category,
          url: detailUrl,
          imageUrl: details.imageUrl || null,
          startTime: parsedTimes.start,
          endTime: parsedTimes.end,
          venueName: venueName || 'Wien',
          latitude,
          longitude,
        });
      }

      return normalizedEvents;
    } catch (error) {
      this.logger.error('Failed to fetch events from Falter', error);
      throw error;
    }
  }

  private async fetchEventDetails(url: string): Promise<{
    description?: string;
    address?: string;
    imageUrl?: string | null;
  }> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<string>(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
          timeout: 8000,
        }),
      );

      const $ = cheerio.load(response.data);

      // 1. Generic Address extraction (extracting div or span containing a 4-digit zip code followed by Wien)
      let address = '';
      $('div, span, p, a').each((i, el) => {
        const text = $(el)
          .clone()
          .children()
          .remove()
          .end()
          .text()
          .trim()
          .replace(/\s+/g, ' ');
        if (/\b\d{4}\b\s+Wien/i.test(text) && text.length < 150) {
          address = text;
        }
      });

      // 2. Generic Teaser / Description extraction
      // Falter pages often have editorial summaries or short descriptions
      let description = '';
      const metaDesc = $('meta[name="description"], meta[property="og:description"]').first();
      if (metaDesc.length > 0) {
        description = metaDesc.attr('content') || '';
      }

      // If meta description is generic, look for local paragraph text in detail section
      if (!description || description.includes('Stöbern Sie hier through unsere Event-Suche')) {
        description = $('main p, article p')
          .first()
          .text()
          .trim()
          .replace(/\s+/g, ' ');
      }

      // 3. Image extraction (find CDN image in main container)
      let imageUrl: string | null = null;
      const imgEl = $('main img, article img')
        .filter((i, img) => {
          const src = $(img).attr('src') || '';
          return src.includes('falter.at') || src.includes('cdn');
        })
        .first();

      if (imgEl.length > 0) {
        imageUrl = imgEl.attr('src') || null;
      }

      return {
        description: description.substring(0, 500),
        address: address || undefined,
        imageUrl,
      };
    } catch (error) {
      this.logger.warn(`Failed to fetch event details from: ${url}. Skipping details.`);
      return {};
    }
  }

  private parseFalterTime(
    timeText: string,
    fallbackDateStr: string,
  ): { start: Date; end: Date | null } {
    // Expected format: "Sonntag, 09.08.2026 19:30" or "Sonntag, 09.08.2026 00:00 – 23:59"
    const dateMatch = timeText.match(/(\d{2})\.(\d{2})\.(\d{4})/);
    const startStr = dateMatch
      ? `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`
      : fallbackDateStr;

    // Time ranges: e.g. "19:30" or "00:00 – 23:59"
    const times = timeText.match(/(\d{2}):(\d{2})/g);
    const startTimeStr = times && times[0] ? times[0] : '00:00';
    const endTimeStr = times && times[1] ? times[1] : null;

    const start = new Date(`${startStr}T${startTimeStr}:00+02:00`);
    let end: Date | null = null;
    if (endTimeStr) {
      end = new Date(`${startStr}T${endTimeStr}:00+02:00`);
    }

    return { start, end };
  }

  private async geocodeAddress(
    address: string,
  ): Promise<{ lat: number; lng: number }> {
    try {
      this.logger.debug(`Geocoding address: "${address}" via Nominatim...`);
      const response = await firstValueFrom(
        this.httpService.get<any>(
          'https://nominatim.openstreetmap.org/search',
          {
            headers: {
              'User-Agent': 'WienWasGehtEventsApp/1.0 (valentin.cello@gmail.com)',
            },
            params: {
              q: address,
              format: 'json',
              limit: 1,
            },
            timeout: 5000,
          },
        ),
      );

      const data = response.data;
      if (Array.isArray(data) && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        if (!isNaN(lat) && !isNaN(lng)) {
          this.logger.debug(`Resolved "${address}" to [${lat}, ${lng}]`);
          return { lat, lng };
        }
      }
    } catch (error) {
      this.logger.warn(`Geocoding failed for address: "${address}". Falling back to (0,0).`);
    }

    return { lat: 0.0, lng: 0.0 };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
