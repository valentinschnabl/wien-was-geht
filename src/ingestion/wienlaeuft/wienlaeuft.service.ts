import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as cheerio from 'cheerio';
import { Prisma } from '@prisma/client';
import { IEventProvider } from '../../interfaces/event-provider.interface';
import { resolveViennaVenueCoordinates } from '../../common/constants/vienna-venues';
import { createViennaDate } from '../../common/utils/time.util';

@Injectable()
export class WienLaeuftService implements IEventProvider {
  private readonly logger = new Logger(WienLaeuftService.name);
  private readonly eventsUrl = 'https://www.wienlaeuft.at/de/events';

  constructor(private readonly httpService: HttpService) {}

  async fetchEvents(): Promise<Prisma.EventCreateInput[]> {
    this.logger.log('Fetching running races and running club events from Wienläuft...');

    try {
      const response = await firstValueFrom(
        this.httpService.get<string>(this.eventsUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Accept: 'text/html,application/xhtml+xml',
          },
          timeout: 15000,
        }),
      );

      return this.parseEventsHtml(response.data);
    } catch (error) {
      this.logger.warn(`Failed to fetch events from Wienläuft: ${(error as Error).message}`);
      return [];
    }
  }

  public parseEventsHtml(html: string): Prisma.EventCreateInput[] {
    const $ = cheerio.load(html);
    const events: Prisma.EventCreateInput[] = [];

    $('a[href*="eventdbshow"]').each((_, el) => {
      const href = $(el).attr('href') || '';
      const parentBlock = $(el).closest('tr, div, li, article');
      const blockText = parentBlock.text().replace(/\s+/g, ' ').trim();

      // Extract title
      let title = $(el).text().trim().replace(/\s+/g, ' ');
      if (!title || title.length < 3) {
        const titleMatch = blockText.match(/^([^,–:;]+?)(?:\s+Ort:|\s+Datum:|$)/i);
        if (titleMatch) {
          title = titleMatch[1].trim();
        }
      }

      if (!title || title.length < 3) return;

      // Extract Date from href (e.g. "de/eventdbshow-augartenlauf-30.08.2026") or from block text (DD.MM.YYYY)
      const dateHrefMatch = href.match(/(\d{2})\.(\d{2})\.(\d{4})/);
      const dateTextMatch = blockText.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);

      const day = dateHrefMatch ? dateHrefMatch[1] : dateTextMatch ? dateTextMatch[1].padStart(2, '0') : null;
      const month = dateHrefMatch ? dateHrefMatch[2] : dateTextMatch ? dateTextMatch[2].padStart(2, '0') : null;
      const year = dateHrefMatch ? dateHrefMatch[3] : dateTextMatch ? dateTextMatch[3] : null;

      if (!day || !month || !year) return;

      const dateStr = `${year}-${month}-${day}`;

      // Extract venue / location from block text
      const venueMatch = blockText.match(/Ort:\s*([^;]+)/i);
      const venueDescription = venueMatch ? venueMatch[1].trim() : 'Wien';
      const venueName = `${venueDescription}${venueDescription.toLowerCase().includes('wien') ? '' : ', Wien'}`;

      // Geocoding
      const resolved =
        resolveViennaVenueCoordinates(venueDescription) ||
        resolveViennaVenueCoordinates(title) || {
          lat: 0,
          lng: 0,
        };

      // Default running race start time is usually morning (09:00 - 13:00) unless Night Run
      const isNightRun = title.toLowerCase().includes('night');
      const startHour = isNightRun ? '19:30' : '09:00';
      const endHour = isNightRun ? '22:30' : '13:00';

      const start = createViennaDate(dateStr, startHour);
      const end = createViennaDate(dateStr, endHour);

      const slugMatch = href.match(/eventdbshow-([a-zA-Z0-9_\-\.]+)/);
      const slug = slugMatch ? slugMatch[1] : `${day}-${month}-${year}`;
      const externalId = `wienlaeuft-${slug}`;

      const fullUrl = href.startsWith('http') ? href : `https://www.wienlaeuft.at/${href.replace(/^\//, '')}`;

      events.push({
        externalId,
        provider: 'WIENLAEUFT',
        title: `Lauf-Event: ${title}`,
        description: `Offizieller Wiener Lauf- und Community-Bewerb: ${title} in ${venueDescription}. Distanzen & Anmeldung auf wienlaeuft.at.`,
        category: 'Sports',
        url: fullUrl,
        imageUrl: null,
        startTime: start,
        endTime: end,
        venueName,
        latitude: resolved.lat,
        longitude: resolved.lng,
        isFree: false,
      });
    });

    this.logger.log(`Parsed ${events.length} running race events from Wienläuft.`);
    return events;
  }
}
