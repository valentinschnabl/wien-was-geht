import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { StadtWienService } from './stadt-wien/stadt-wien.service';
import { EventfrogService } from './eventfrog/eventfrog.service';
import { TicketmasterService } from './ticketmaster/ticketmaster.service';
import { EventbriteService } from './eventbrite/eventbrite.service';
import { GoodnightService } from './goodnight/goodnight.service';
import { EventsAtService } from './events-at/events-at.service';
import { ResidentAdvisorService } from './resident-advisor/resident-advisor.service';
import { CapeetService } from './capeet/capeet.service';
import { OhSchonHellService } from './oh-schon-hell/oh-schon-hell.service';
import { EintrittFreiService } from './eintritt-frei/eintritt-frei.service';
import { KultursommerService } from './kultursommer/kultursommer.service';
import { LumaService } from './luma/luma.service';
import { ViennaClubsService } from './vienna-clubs/vienna-clubs.service';
import { RausgegangenService } from './rausgegangen/rausgegangen.service';
import { WardaService } from './warda/warda.service';
import { BewegtImParkService } from './bewegt-im-park/bewegt-im-park.service';
import { WienLaeuftService } from './wienlaeuft/wienlaeuft.service';
import { AiCategorizerService } from './ai-categorizer/ai-categorizer.service';
import { EventPersistenceService } from './event-persistence.service';
import { Prisma } from '@prisma/client';

import { detectIsFree } from '../common/utils/pricing.util';

export interface IngestionResult {
  fetched: number;
  persisted: number;
  pruned: number;
}

@Injectable()
export class IngestionService implements OnModuleInit {
  private readonly logger = new Logger(IngestionService.name);
  private readonly retentionWindowHours = 48;

  constructor(
    private readonly stadtWienProvider: StadtWienService,
    private readonly eventfrogProvider: EventfrogService,
    private readonly ticketmasterProvider: TicketmasterService,
    private readonly eventbriteProvider: EventbriteService,
    private readonly goodnightProvider: GoodnightService,
    private readonly eventsAtProvider: EventsAtService,
    private readonly residentAdvisorProvider: ResidentAdvisorService,
    private readonly capeetProvider: CapeetService,
    private readonly ohSchonHellProvider: OhSchonHellService,
    private readonly eintrittFreiProvider: EintrittFreiService,
    private readonly kultursommerProvider: KultursommerService,
    private readonly lumaProvider: LumaService,
    private readonly viennaClubsProvider: ViennaClubsService,
    private readonly rausgegangenProvider: RausgegangenService,
    private readonly wardaProvider: WardaService,
    private readonly bewegtImParkProvider: BewegtImParkService,
    private readonly wienLaeuftProvider: WienLaeuftService,
    private readonly aiCategorizer: AiCategorizerService,
    private readonly persistence: EventPersistenceService,
  ) {}

  // Run initial ingestion automatically in background when module starts
  onModuleInit() {
    this.logger.log('Scheduling background startup ingestion run...');
    setTimeout(() => {
      this.run().catch((err) => {
        this.logger.error('Startup ingestion run failed', err);
      });
    }, 1000);
  }

  // Daily automated ingestion run at 4:00 AM UTC
  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async handleDailyCron() {
    this.logger.log('Triggering automated daily cron ingestion run...');
    try {
      await this.run();
    } catch (err) {
      this.logger.error('Daily cron ingestion run failed', err);
    }
  }

  async run(): Promise<IngestionResult> {
    this.logger.log('Starting ingestion run.');

    const pruned = await this.persistence.pruneExpiredEvents(
      this.retentionWindowHours,
    );

    // Fetch from all active providers
    const providers = [
      { name: 'Stadt Wien', fetcher: () => this.stadtWienProvider.fetchEvents() },
      { name: 'Eventfrog', fetcher: () => this.eventfrogProvider.fetchEvents() },
      { name: 'Ticketmaster', fetcher: () => this.ticketmasterProvider.fetchEvents() },
      { name: 'Eventbrite', fetcher: () => this.eventbriteProvider.fetchEvents() },
      { name: 'Goodnight.at', fetcher: () => this.goodnightProvider.fetchEvents() },
      { name: 'Events.at', fetcher: () => this.eventsAtProvider.fetchEvents() },
      { name: 'Resident Advisor', fetcher: () => this.residentAdvisorProvider.fetchEvents() },
      { name: 'Capeet', fetcher: () => this.capeetProvider.fetchEvents() },
      { name: 'ohschonhell.at', fetcher: () => this.ohSchonHellProvider.fetchEvents() },
      { name: 'eintrittfrei.at', fetcher: () => this.eintrittFreiProvider.fetchEvents() },
      { name: 'Kultursommer Wien', fetcher: () => this.kultursommerProvider.fetchEvents() },
      { name: 'Luma Vienna', fetcher: () => this.lumaProvider.fetchEvents() },
      { name: 'Vienna Clubs', fetcher: () => this.viennaClubsProvider.fetchEvents() },
      { name: 'Rausgegangen Wien', fetcher: () => this.rausgegangenProvider.fetchEvents() },
      { name: 'WARDA Wien', fetcher: () => this.wardaProvider.fetchEvents() },
      { name: 'Bewegt im Park', fetcher: () => this.bewegtImParkProvider.fetchEvents() },
      { name: 'Wienläuft', fetcher: () => this.wienLaeuftProvider.fetchEvents() },
    ];

    const results = await Promise.allSettled(providers.map(p => p.fetcher()));

    const combinedEvents: Prisma.EventCreateInput[] = [];
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        combinedEvents.push(...result.value);
      } else {
        this.logger.error(`${providers[index].name} ingestion failed`, result.reason);
      }
    });
    const deduplicatedEvents = this.deduplicateEvents(combinedEvents);

    // AI Categorization & Price Enrichment step: Classify events with Gemini 2.5 Flash
    const categorizedEvents = await this.aiCategorizer.categorizeEvents(
      deduplicatedEvents,
    );

    const persisted = await this.persistence.saveEvents(categorizedEvents);

    this.logger.log(
      `Ingestion complete. Combined total fetched: ${combinedEvents.length}, ` +
      `deduplicated to: ${deduplicatedEvents.length}, persisted: ${persisted}, pruned: ${pruned}.`,
    );

    return {
      fetched: combinedEvents.length,
      persisted,
      pruned,
    };
  }

  private deduplicateEvents(
    events: Prisma.EventCreateInput[],
  ): Prisma.EventCreateInput[] {
    const uniqueEvents: Prisma.EventCreateInput[] = [];
    const eventsMap = new Map<string, number>();

    for (const event of events) {
      const normTitle = this.normalizeTitle(event.title);
      const startDate = new Date(event.startTime);
      const dateKey = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`;
      const compositeKey = `${normTitle}_${dateKey}`;

      if (eventsMap.has(compositeKey)) {
        const existingIndex = eventsMap.get(compositeKey)!;
        const existing = uniqueEvents[existingIndex];
        const startMs = startDate.getTime();
        const existingStartMs = new Date(existing.startTime).getTime();

        // 2. Time match (start times are within 1 hour)
        const timeMatches = Math.abs(existingStartMs - startMs) <= 60 * 60 * 1000;

        // 3. Location match (similar venue name or close geo coordinates within ~500m)
        const venueMatches =
          (existing.venueName &&
            event.venueName &&
            (existing.venueName.toLowerCase().includes(event.venueName.toLowerCase()) ||
              event.venueName.toLowerCase().includes(existing.venueName.toLowerCase()))) ||
          (existing.latitude !== 0 &&
            existing.longitude !== 0 &&
            event.latitude !== 0 &&
            event.longitude !== 0 &&
            Math.abs(existing.latitude - event.latitude) < 0.005 &&
            Math.abs(existing.longitude - event.longitude) < 0.005);

        if (timeMatches && venueMatches) {
          const newScore = this.getEventQualityScore(event);
          const existingScore = this.getEventQualityScore(existing);

          // Prioritize non-scraped, richer events (with photos, official APIs, better metadata)
          if (newScore > existingScore) {
            this.logger.debug(
              `Deduplication: Replaced event "${existing.title}" (${existing.provider}, score ${existingScore}) with higher quality ${event.provider} (score ${newScore}).`,
            );
            uniqueEvents[existingIndex] = event;
          } else {
            this.logger.debug(
              `Deduplication: Kept existing higher/equal quality event "${existing.title}" (${existing.provider}, score ${existingScore}) over ${event.provider} (score ${newScore}).`,
            );
          }
        } else {
          uniqueEvents.push(event);
        }
      } else {
        uniqueEvents.push(event);
        eventsMap.set(compositeKey, uniqueEvents.length - 1);
      }
    }

    return uniqueEvents;
  }

  private getEventQualityScore(event: Prisma.EventCreateInput): number {
    let score = 0;

    // 1. Official API Providers prioritized over scraped sources
    const providerPriority: Record<string, number> = {
      TICKETMASTER: 50,
      EVENTBRITE: 50,
      RESIDENT_ADVISOR: 48,
      VIENNA_CLUBS: 46,
      EVENTFROG: 45,
      LUMA: 42,
      KULTURSOMMER: 40,
      STADT_WIEN: 40,
      WARDA: 38,
      CAPEET: 35,
      RAUSGEGANGEN: 35,
      OH_SCHON_HELL: 30,
      OPENWEB_NINJA: 30,
      EINTRITT_FREI: 25,
      GOODNIGHT: 10,
      EVENTS_AT: 10,
    };

    score += providerPriority[event.provider] ?? 20;

    // 2. Has photo/image
    if (event.imageUrl) {
      score += 30;
    }

    // 3. Has detailed description
    if (event.description && event.description.length > 50) {
      score += 15;
    }

    // 4. Has accurate geo coordinates
    if (event.latitude !== 0 && event.longitude !== 0) {
      score += 10;
    }

    // 5. Has direct link
    if (event.url) {
      score += 5;
    }

    return score;
  }

  private normalizeTitle(title: string): string {
    return title.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
  }
}
