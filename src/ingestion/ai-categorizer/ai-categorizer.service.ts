import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Prisma } from '@prisma/client';

export type EventCategory =
  | 'Music'
  | 'Nightlife'
  | 'Culture'
  | 'Sports'
  | 'Culinary'
  | 'Family';

const VALID_CATEGORIES: EventCategory[] = [
  'Music',
  'Nightlife',
  'Culture',
  'Sports',
  'Culinary',
  'Family',
];

import { detectIsFree } from '../../common/utils/pricing.util';

interface GeminiClassificationItem {
  id: string;
  category: EventCategory;
  isFree?: boolean;
  latitude?: number | null;
  longitude?: number | null;
}

@Injectable()
export class AiCategorizerService {
  private readonly logger = new Logger(AiCategorizerService.name);
  private readonly geminiModel =
    process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';

  constructor(private readonly httpService: HttpService) {}

  async categorizeEvents(
    events: Prisma.EventCreateInput[],
  ): Promise<Prisma.EventCreateInput[]> {
    const apiKey = process.env.GEMINI_API_KEY;

    // Filter to only events that truly need AI classification, price resolution or coordinate resolution
    const resolvedEvents: Prisma.EventCreateInput[] = [];
    const eventsNeedingAi: Prisma.EventCreateInput[] = [];

    for (const ev of events) {
      const keywordFree = detectIsFree(ev.provider, ev.title, ev.description);
      const isFreeResolved =
        ev.isFree !== undefined && ev.isFree !== null ? ev.isFree : keywordFree;
      const hasSpecificCategory =
        ev.category &&
        ev.category !== 'General' &&
        VALID_CATEGORIES.includes(ev.category as EventCategory);

      const isActualStephansplatz =
        ev.venueName &&
        (ev.venueName.toLowerCase().includes('stephansplatz') ||
          ev.venueName.toLowerCase().includes('stephansdom') ||
          ev.venueName.toLowerCase().includes('dompfarre'));

      const isUnresolvedOrCenter =
        !ev.latitude ||
        !ev.longitude ||
        (ev.latitude === 0 && ev.longitude === 0) ||
        (Math.abs(ev.latitude - 48.2082) < 0.001 &&
          Math.abs(ev.longitude - 16.3738) < 0.001 &&
          !isActualStephansplatz);

      const hasValidCoords =
        typeof ev.latitude === 'number' &&
        typeof ev.longitude === 'number' &&
        ev.latitude >= 48.05 &&
        ev.latitude <= 48.36 &&
        ev.longitude >= 16.15 &&
        ev.longitude <= 16.60 &&
        !isUnresolvedOrCenter;

      if (isFreeResolved !== null && hasSpecificCategory && hasValidCoords) {
        resolvedEvents.push({
          ...ev,
          isFree: isFreeResolved,
        });
      } else {
        eventsNeedingAi.push({
          ...ev,
          isFree: isFreeResolved !== null ? isFreeResolved : undefined,
        });
      }
    }

    if (eventsNeedingAi.length === 0) {
      return resolvedEvents;
    }

    this.logger.log(
      `AI Processing ${eventsNeedingAi.length} events (category, pricing & geo resolution) out of ${events.length} using ${apiKey ? this.geminiModel : 'Keyword Fallback'}...`,
    );

    if (apiKey) {
      try {
        const classified = await this.classifyWithGemini(eventsNeedingAi, apiKey);
        return [...resolvedEvents, ...classified];
      } catch (err) {
        this.logger.warn(
          `Gemini AI categorization failed, falling back to keyword heuristics: ${(err as Error).message}`,
        );
      }
    }

    // Fallback to keyword matching & regex price detection
    const fallbackEvents = eventsNeedingAi.map((ev) => ({
      ...ev,
      category:
        ev.category && ev.category !== 'General' && VALID_CATEGORIES.includes(ev.category as EventCategory)
          ? ev.category
          : this.classifyWithKeywords(ev.title, ev.description || ''),
      isFree:
        ev.isFree !== undefined && ev.isFree !== null
          ? ev.isFree
          : detectIsFree(ev.provider, ev.title, ev.description) ?? false,
      latitude:
        ev.latitude && ev.latitude !== 0 && !(Math.abs(ev.latitude - 48.2082) < 0.001 && Math.abs(ev.longitude! - 16.3738) < 0.001)
          ? ev.latitude
          : 0,
      longitude:
        ev.longitude && ev.longitude !== 0 && !(Math.abs(ev.latitude! - 48.2082) < 0.001 && Math.abs(ev.longitude - 16.3738) < 0.001)
          ? ev.longitude
          : 0,
    }));

    return [...resolvedEvents, ...fallbackEvents];
  }

  private async classifyWithGemini(
    events: Prisma.EventCreateInput[],
    apiKey: string,
  ): Promise<Prisma.EventCreateInput[]> {
    const batchSize = 30;

    // Split into batches
    const batches: Prisma.EventCreateInput[][] = [];
    for (let i = 0; i < events.length; i += batchSize) {
      batches.push(events.slice(i, i + batchSize));
    }

    const batchPromises = batches.map(async (batch) => {
      const batchInput = batch.map((ev, index) => ({
        id: String(index),
        title: ev.title,
        description: ev.description ? ev.description.substring(0, 160) : '',
        venue: ev.venueName,
      }));

      const prompt = `
You are an expert event categorization, pricing and precise geocoding AI for events in Vienna (Wien), Austria.
For each event, determine:
1. "category": EXACTLY ONE of "Music", "Nightlife", "Culture", "Sports", "Culinary", "Family".
2. "isFree": boolean (true if free of charge / gratis / free admission / open air without ticket / freie Spende / vernissage / community festival; false if commercial ticket, entrance fee or club admission is required).
3. "latitude" (number) and "longitude" (number):
   - You MUST identify the real-world venue/address in Vienna based on "venue", "title", and "description" (e.g. "Kino am Dach" -> 48.2025, 16.3382; "Praterdome" -> 48.2168, 16.3975; "Lucky Punch Comedy Club" -> 48.2255, 16.3638; "Himmel und Wasser" -> 48.1755, 16.4835; "boulderbar Seestadt" -> 48.2268, 16.5078; "Palais Schönborn" -> 48.2122, 16.3665; "Stadioncenter" -> 48.2112, 16.4215).
   - If located in Vienna, return the EXACT latitude and longitude numbers (lat 48.10 to 48.33, lng 16.20 to 16.55).
   - If OUTSIDE Vienna (e.g. St. Pölten, Kautzen, Graz, Germany) or truly has no recognizable physical location, return null for both latitude and longitude.

Return ONLY a valid JSON array of objects with fields: "id", "category", "isFree", "latitude", "longitude".

Events:
${JSON.stringify(batchInput, null, 2)}
`;

      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.geminiModel}:generateContent`;
        const response = await firstValueFrom(
          this.httpService.post<any>(
            url,
            {
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                responseMimeType: 'application/json',
                temperature: 0.1,
              },
            },
            {
              headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': apiKey,
              },
              timeout: 10000,
            },
          ),
        );

        const rawText =
          response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText) {
          const results: GeminiClassificationItem[] = JSON.parse(rawText);
          const resultMap = new Map(results.map((r) => [r.id, r]));

          return batch.map((ev, index) => {
            const aiItem = resultMap.get(String(index));
            const aiCategory = aiItem?.category;
            const finalCategory =
              aiCategory && VALID_CATEGORIES.includes(aiCategory)
                ? aiCategory
                : (ev.category && ev.category !== 'General' && VALID_CATEGORIES.includes(ev.category as EventCategory))
                ? ev.category
                : this.classifyWithKeywords(ev.title, ev.description || '');

            const keywordFree = detectIsFree(ev.provider, ev.title, ev.description);
            const finalIsFree =
              ev.isFree !== undefined && ev.isFree !== null
                ? ev.isFree
                : keywordFree !== null
                ? keywordFree
                : (aiItem?.isFree ?? false);

            let finalLat = ev.latitude;
            let finalLng = ev.longitude;

            const isActualStephansplatz =
              ev.venueName &&
              (ev.venueName.toLowerCase().includes('stephansplatz') ||
                ev.venueName.toLowerCase().includes('stephansdom') ||
                ev.venueName.toLowerCase().includes('dompfarre'));

            // If coordinates are missing, 0, or default Stephansplatz fallback for a non-Stephansplatz venue
            const isUnresolvedCoord =
              !finalLat ||
              !finalLng ||
              (finalLat === 0 && finalLng === 0) ||
              (Math.abs(finalLat - 48.2082) < 0.001 &&
                Math.abs(finalLng - 16.3738) < 0.001 &&
                !isActualStephansplatz);

            if (isUnresolvedCoord) {
              if (
                typeof aiItem?.latitude === 'number' &&
                typeof aiItem?.longitude === 'number' &&
                aiItem.latitude >= 48.05 &&
                aiItem.latitude <= 48.36 &&
                aiItem.longitude >= 16.15 &&
                aiItem.longitude <= 16.60
              ) {
                finalLat = aiItem.latitude;
                finalLng = aiItem.longitude;
              } else {
                // If unknown or outside Vienna, set 0,0 so it's only shown on list, not on map
                finalLat = 0;
                finalLng = 0;
              }
            }

            return {
              ...ev,
              category: finalCategory,
              isFree: finalIsFree,
              latitude: finalLat,
              longitude: finalLng,
            };
          });
        }
        return batch;
      } catch (error) {
        this.logger.warn(`AI batch categorization failed: ${(error as Error).message}`);
        return batch.map((ev) => ({
          ...ev,
          category:
            ev.category && ev.category !== 'General' && VALID_CATEGORIES.includes(ev.category as EventCategory)
              ? ev.category
              : this.classifyWithKeywords(ev.title, ev.description || ''),
          isFree:
            ev.isFree !== undefined && ev.isFree !== null
              ? ev.isFree
              : detectIsFree(ev.provider, ev.title, ev.description) ?? false,
        }));
      }
    });

    const settled = await Promise.all(batchPromises);
    return settled.flat();
  }

  public classifyWithKeywords(title: string, description: string): EventCategory {
    const text = `${title} ${description}`.toLowerCase();

    // 1. Family
    if (
      text.includes('kinder') ||
      text.includes('familie') ||
      text.includes('kasperl') ||
      text.includes('puppentheater') ||
      text.includes('märchen') ||
      text.includes('kleinkind')
    ) {
      return 'Family';
    }

    // 2. Nightlife
    if (
      text.includes('techno') ||
      text.includes('rave') ||
      text.includes('party') ||
      text.includes('dj') ||
      text.includes('clubbing') ||
      text.includes('afterhour') ||
      text.includes('klubnacht') ||
      text.includes('dancefloor') ||
      text.includes('das werk') ||
      text.includes('sass') ||
      text.includes('prst') ||
      text.includes('fluc') ||
      text.includes('vie i pee')
    ) {
      return 'Nightlife';
    }

    // 3. Music
    if (
      text.includes('konzert') ||
      text.includes('concert') ||
      text.includes('live music') ||
      text.includes('band') ||
      text.includes('orchester') ||
      text.includes('philharmonie') ||
      text.includes('jazz') ||
      text.includes('akustik') ||
      text.includes('chor') ||
      text.includes('symphon') ||
      text.includes('singer') ||
      text.includes('gitarre') ||
      text.includes('klavier')
    ) {
      return 'Music';
    }

    // 4. Sports
    if (
      text.includes('yoga') ||
      text.includes('lauf') ||
      text.includes('marathon') ||
      text.includes('fitness') ||
      text.includes('workout') ||
      text.includes('turnier') ||
      text.includes('klettern') ||
      text.includes('sport') ||
      text.includes('wassersport')
    ) {
      return 'Sports';
    }

    // 5. Culinary
    if (
      text.includes('wein') ||
      text.includes('tasting') ||
      text.includes('verkostung') ||
      text.includes('streetfood') ||
      text.includes('kulinarik') ||
      text.includes('brunch') ||
      text.includes('bier') ||
      text.includes('markt') ||
      text.includes('kochkurs')
    ) {
      return 'Culinary';
    }

    // 6. Default to Culture for cultural walks, exhibitions, theater, tours
    return 'Culture';
  }
}
