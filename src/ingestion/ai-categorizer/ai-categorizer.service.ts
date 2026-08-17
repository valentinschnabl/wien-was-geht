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
}

@Injectable()
export class AiCategorizerService {
  private readonly logger = new Logger(AiCategorizerService.name);
  private readonly geminiModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  constructor(private readonly httpService: HttpService) {}

  async categorizeEvents(
    events: Prisma.EventCreateInput[],
  ): Promise<Prisma.EventCreateInput[]> {
    const apiKey = process.env.GEMINI_API_KEY;

    // Filter to only events that truly need AI classification or price resolution
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

      if (isFreeResolved !== null && hasSpecificCategory) {
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
      `AI Categorizing ${eventsNeedingAi.length} unresolved events (out of ${events.length}) using ${apiKey ? this.geminiModel : 'Keyword Fallback'}...`,
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
    }));

    return [...resolvedEvents, ...fallbackEvents];
  }

  private async classifyWithGemini(
    events: Prisma.EventCreateInput[],
    apiKey: string,
  ): Promise<Prisma.EventCreateInput[]> {
    const batchSize = 25;
    const classifiedEvents: Prisma.EventCreateInput[] = [];

    for (let i = 0; i < events.length; i += batchSize) {
      // Throttle between batches to respect RPM limits
      if (i > 0) {
        await new Promise((res) => setTimeout(res, 1500));
      }

      const batch = events.slice(i, i + batchSize);
      const batchInput = batch.map((ev, index) => ({
        id: String(index),
        title: ev.title,
        description: ev.description ? ev.description.substring(0, 160) : '',
        venue: ev.venueName,
      }));

      const prompt = `
You are an expert event categorization and pricing AI for events happening in Vienna, Austria.
For each event, determine:
1. "category": EXACTLY ONE of "Music", "Nightlife", "Culture", "Sports", "Culinary", "Family".
2. "isFree": boolean (true if the event is free of charge / gratis / free admission / open air without ticket / freie Spende / vernissage / community festival; false if commercial ticket, entrance fee or club admission is required).

Return ONLY a valid JSON array of objects with "id", "category", and "isFree".

Events:
${JSON.stringify(batchInput, null, 2)}
`;

      let batchClassified = false;
      const maxRetries = 2;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.geminiModel}:generateContent?key=${apiKey}`;
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
                headers: { 'Content-Type': 'application/json' },
                timeout: 25000,
              },
            ),
          );

          const rawText =
            response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            const results: GeminiClassificationItem[] = JSON.parse(rawText);
            const resultMap = new Map(results.map((r) => [r.id, r]));

            batch.forEach((ev, index) => {
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

              classifiedEvents.push({
                ...ev,
                category: finalCategory,
                isFree: finalIsFree,
              });
            });
            batchClassified = true;
            break;
          }
        } catch (batchErr) {
          const errMsg = (batchErr as Error).message || '';
          const isRateLimit = errMsg.includes('429');

          if (isRateLimit && attempt < maxRetries) {
            this.logger.debug(
              `Gemini 429 rate limit hit, backing off ${(attempt + 1) * 1500}ms...`,
            );
            await new Promise((res) => setTimeout(res, (attempt + 1) * 1500));
            continue;
          }

          this.logger.debug(
            `Batch categorization attempt ${attempt + 1} fallback: ${errMsg}`,
          );
          break;
        }
      }

      // Fallback for this batch if request failed or was rate-limited
      if (!batchClassified) {
        batch.forEach((ev) => {
          classifiedEvents.push({
            ...ev,
            category:
              ev.category && ev.category !== 'General' && VALID_CATEGORIES.includes(ev.category as EventCategory)
                ? ev.category
                : this.classifyWithKeywords(ev.title, ev.description || ''),
            isFree:
              ev.isFree !== undefined && ev.isFree !== null
                ? ev.isFree
                : detectIsFree(ev.provider, ev.title, ev.description) ?? false,
          });
        });
      }
    }

    return classifiedEvents;
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
