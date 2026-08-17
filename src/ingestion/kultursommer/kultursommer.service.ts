import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Prisma } from '@prisma/client';
import { IEventProvider } from '../../interfaces/event-provider.interface';
import { resolveViennaVenueCoordinates } from '../../common/constants/vienna-venues';

interface KsSubmission {
  submission_id?: string;
  genre_category_name?: string;
  ks_kuenstler?: string;
  ks_projekttitel?: string;
  ks_pr_foto_upload_1?: string;
  ks_schlagwort_1?: string;
  ks_schlagwort_2?: string;
  ks_schlagwort_3?: string;
}

interface KsSlot {
  slot_id: string;
  festival_day_date: string; // e.g. "So 16.8." or "Mo 17.8."
  festival_slot_from: string; // e.g. "18:30"
  festival_slot_till: string; // e.g. "19:30"
  location_name: string; // e.g. "Reithofferpark"
  zip_code?: string; // e.g. "15"
  submission_slot?: KsSubmission[];
}

interface KsMonth {
  value: string; // e.g. "08"
  display_value: string;
  slot?: KsSlot[];
}

interface KsApiResponse {
  sub_count?: string;
  month?: KsMonth[];
}

@Injectable()
export class KultursommerService implements IEventProvider {
  private readonly logger = new Logger(KultursommerService.name);
  private readonly apiUrl =
    'https://www.kultursommer.wien/jart/prj3/festival/resources/dbcon-def/reports/apps/kalender_2026/kalender_2026.jartc';

  constructor(private readonly httpService: HttpService) {}

  async fetchEvents(): Promise<Prisma.EventCreateInput[]> {
    try {
      this.logger.log('Fetching official program from Kultursommer Wien API...');

      const payload = {
        'sel-start': 0,
        'row-limit': 500,
        'content-id': '1714038208070',
        'j-project': 'festival',
        'j-index': 'main',
        'reserve-mode': 'active',
        __lang: 'de',
        '__j-language-file': '/prj3/festival/releases/de/lang-config.json',
      };

      const response = await firstValueFrom(
        this.httpService.post<KsApiResponse>(
          this.apiUrl,
          new URLSearchParams({
            cmd: 'getEventsNew',
            data: JSON.stringify(payload),
          }).toString(),
          {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
              'X-Requested-With': 'XMLHttpRequest',
            },
            timeout: 10000,
          },
        ),
      );

      const months = response.data?.month || [];
      const now = new Date();

      const today = new Date(now);
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const targetDayStrings = [
        `${today.getDate()}.${today.getMonth() + 1}.`,
        `${tomorrow.getDate()}.${tomorrow.getMonth() + 1}.`,
      ];

      const events: Prisma.EventCreateInput[] = [];

      for (const m of months) {
        const slots = m.slot || [];
        for (const slot of slots) {
          const dayDate = slot.festival_day_date || '';

          // Check if slot falls on today or tomorrow
          const matchedTarget = targetDayStrings.find((t) => dayDate.includes(t));
          if (!matchedTarget) continue;

          const isTomorrow = matchedTarget === targetDayStrings[1];
          const eventDate = isTomorrow ? tomorrow : today;

          const submissions = slot.submission_slot || [];
          for (const sub of submissions) {
            const rawTitle = [sub.ks_kuenstler, sub.ks_projekttitel]
              .filter(Boolean)
              .join(' – ')
              .trim() || 'Kultursommer Wien';

            const title = `Kultursommer: ${rawTitle}`;

            // Parse start & end times
            const [startHour, startMin] = (slot.festival_slot_from || '18:30')
              .split(':')
              .map((n) => parseInt(n, 10));
            const [endHour, endMin] = (slot.festival_slot_till || '21:00')
              .split(':')
              .map((n) => parseInt(n, 10));

            const startTime = new Date(eventDate);
            startTime.setHours(startHour || 18, startMin || 30, 0, 0);

            const endTime = new Date(eventDate);
            endTime.setHours(endHour || 21, endMin || 0, 0, 0);
            if (endTime <= startTime) {
              endTime.setDate(endTime.getDate() + 1);
            }

            const district = slot.zip_code ? `${slot.zip_code}. Bezirk` : 'Wien';
            const venueName = slot.location_name
              ? `${slot.location_name}, ${district}`
              : `Kultursommer Bühne ${district}`;

            const coords =
              resolveViennaVenueCoordinates(slot.location_name) ||
              resolveViennaVenueCoordinates(venueName) || {
                lat: 48.2082,
                lng: 16.3738,
              };

            const imageUrl = sub.ks_pr_foto_upload_1
              ? `https://kultursommer.wien/jart/prj3/festival/data/fotos/${sub.ks_pr_foto_upload_1}`
              : null;

            const tags = [sub.ks_schlagwort_1, sub.ks_schlagwort_2, sub.ks_schlagwort_3]
              .filter(Boolean)
              .join(', ');

            const description = [
              `Kultursommer Wien 2026 Open-Air-Veranstaltung (${slot.festival_slot_from} – ${slot.festival_slot_till} Uhr). Eintritt frei!`,
              sub.genre_category_name ? `Genre: ${sub.genre_category_name}.` : null,
              tags ? `Tags: ${tags}.` : null,
            ]
              .filter(Boolean)
              .join(' ');

            let category = 'Culture';
            const genre = (sub.genre_category_name || '').toLowerCase();
            if (genre.includes('musik') || genre.includes('konzert')) {
              category = 'Music';
            } else if (genre.includes('mitmach') || genre.includes('kinder') || genre.includes('jugend')) {
              category = 'Family';
            } else if (genre.includes('theater') || genre.includes('kabarett') || genre.includes('tanz') || genre.includes('performance') || genre.includes('literatur')) {
              category = 'Culture';
            }

            const externalId = `kultursommer-${slot.slot_id}-${sub.submission_id || this.slugify(rawTitle)}`;

            events.push({
              externalId,
              provider: 'KULTURSOMMER',
              title,
              description,
              category,
              url: 'https://www.kultursommer.wien/kalender#kalender_2026/ui',
              imageUrl,
              startTime,
              endTime,
              venueName,
              latitude: coords.lat,
              longitude: coords.lng,
              isFree: true,
            });
          }
        }
      }

      this.logger.log(`Extracted ${events.length} active Kultursommer events for today & tomorrow.`);
      return events;
    } catch (error) {
      this.logger.error('Failed to fetch events from Kultursommer Wien API', error);
      return [];
    }
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40);
  }
}
