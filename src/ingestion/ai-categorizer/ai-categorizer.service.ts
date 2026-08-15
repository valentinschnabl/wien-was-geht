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

interface GeminiClassificationItem {
  id: string;
  category: EventCategory;
}

@Injectable()
export class AiCategorizerService {
  private readonly logger = new Logger(AiCategorizerService.name);
  private readonly geminiModel = 'gemini-2.5-flash';

  constructor(private readonly httpService: HttpService) {}

  async categorizeEvents(
    events: Prisma.EventCreateInput[],
  ): Promise<Prisma.EventCreateInput[]> {
    const apiKey = process.env.GEMINI_API_KEY;

    // Separate events that already have a specific category from those needing AI classification
    const eventsNeedingClassification: Prisma.EventCreateInput[] = [];
    const unchangedEvents: Prisma.EventCreateInput[] = [];

    for (const ev of events) {
      if (
        ev.category &&
        ev.category !== 'General' &&
        VALID_CATEGORIES.includes(ev.category as EventCategory)
      ) {
        unchangedEvents.push(ev);
      } else {
        eventsNeedingClassification.push(ev);
      }
    }

    if (eventsNeedingClassification.length === 0) {
      return events;
    }

    this.logger.log(
      `Categorizing ${eventsNeedingClassification.length} events using ${apiKey ? 'Gemini 2.5 Flash' : 'Keyword Fallback'}...`,
    );

    if (apiKey) {
      try {
        const classified = await this.classifyWithGemini(
          eventsNeedingClassification,
          apiKey,
        );
        return [...unchangedEvents, ...classified];
      } catch (err) {
        this.logger.warn(
          `Gemini AI categorization failed, falling back to keyword heuristics: ${(err as Error).message}`,
        );
      }
    }

    // Fallback to keyword matching
    const classifiedWithKeywords = eventsNeedingClassification.map((ev) => ({
      ...ev,
      category: this.classifyWithKeywords(ev.title, ev.description || ''),
    }));

    return [...unchangedEvents, ...classifiedWithKeywords];
  }

  private async classifyWithGemini(
    events: Prisma.EventCreateInput[],
    apiKey: string,
  ): Promise<Prisma.EventCreateInput[]> {
    const batchSize = 40;
    const classifiedEvents: Prisma.EventCreateInput[] = [];

    for (let i = 0; i < events.length; i += batchSize) {
      const batch = events.slice(i, i + batchSize);
      const batchInput = batch.map((ev, index) => ({
        id: String(index),
        title: ev.title,
        description: ev.description ? ev.description.substring(0, 150) : '',
        venue: ev.venueName,
      }));

      const prompt = `
You are an expert event categorization AI for events happening in Vienna, Austria.
Classify each of the following events into EXACTLY ONE of these categories:
- "Music" (Live concerts, bands, classical music, jazz, acoustic, choir, orchestra)
- "Nightlife" (Raves, techno, electronic club nights, party, DJ sets, afterhours)
- "Culture" (Theater, exhibitions, comedy/kabarett, museums, guided walking tours, readings, vernissage)
- "Sports" (Yoga, fitness workouts, running, cycling, sports tournaments)
- "Culinary" (Food festivals, wine/beer tastings, markets, street food, cooking workshops)
- "Family" (Events specifically targeted at children, toddlers, puppets, and families)

Return ONLY a valid JSON array of objects with "id" and "category".

Events:
${JSON.stringify(batchInput, null, 2)}
`;

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
              timeout: 10000,
            },
          ),
        );

        const rawText =
          response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText) {
          const results: GeminiClassificationItem[] = JSON.parse(rawText);
          const resultMap = new Map(results.map((r) => [r.id, r.category]));

          batch.forEach((ev, index) => {
            const aiCategory = resultMap.get(String(index));
            const finalCategory =
              aiCategory && VALID_CATEGORIES.includes(aiCategory)
                ? aiCategory
                : this.classifyWithKeywords(ev.title, ev.description || '');

            classifiedEvents.push({
              ...ev,
              category: finalCategory,
            });
          });
          continue;
        }
      } catch (batchErr) {
        this.logger.debug(
          `Batch classification failed: ${(batchErr as Error).message}`,
        );
      }

      // Fallback for this batch if request failed
      batch.forEach((ev) => {
        classifiedEvents.push({
          ...ev,
          category: this.classifyWithKeywords(ev.title, ev.description || ''),
        });
      });
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
