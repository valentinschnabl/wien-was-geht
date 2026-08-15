import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { StadtWienService } from './stadt-wien/stadt-wien.service';
import { EventfrogService } from './eventfrog/eventfrog.service';
import { OpenwebNinjaService } from './openweb-ninja/openweb-ninja.service';
import { TicketmasterService } from './ticketmaster/ticketmaster.service';
import { EventbriteService } from './eventbrite/eventbrite.service';
import { GoodnightService } from './goodnight/goodnight.service';
import { EventsAtService } from './events-at/events-at.service';
import { EventPersistenceService } from './event-persistence.service';
import { Prisma } from '@prisma/client';

export interface IngestionResult {
  fetched: number;
  persisted: number;
  pruned: number;
}

@Injectable()
export class IngestionService implements OnModuleInit {
  private readonly logger = new Logger(IngestionService.name);
  private readonly retentionWindowHours = 24;

  constructor(
    private readonly stadtWienProvider: StadtWienService,
    private readonly eventfrogProvider: EventfrogService,
    private readonly ninjaProvider: OpenwebNinjaService,
    private readonly ticketmasterProvider: TicketmasterService,
    private readonly eventbriteProvider: EventbriteService,
    private readonly goodnightProvider: GoodnightService,
    private readonly eventsAtProvider: EventsAtService,
    private readonly persistence: EventPersistenceService,
  ) {}

  // Run initial ingestion automatically when module starts
  async onModuleInit() {
    this.logger.log('Executing startup ingestion run...');
    try {
      await this.run();
    } catch (err) {
      this.logger.error('Startup ingestion run failed', err);
    }
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
    let stadtWienEvents: Prisma.EventCreateInput[] = [];
    try {
      stadtWienEvents = await this.stadtWienProvider.fetchEvents();
    } catch (error) {
      this.logger.error('Stadt Wien ingestion failed', error);
    }

    let eventfrogEvents: Prisma.EventCreateInput[] = [];
    try {
      eventfrogEvents = await this.eventfrogProvider.fetchEvents();
    } catch (error) {
      this.logger.error('Eventfrog ingestion failed', error);
    }

    let ninjaEvents: Prisma.EventCreateInput[] = [];
    try {
      ninjaEvents = await this.ninjaProvider.fetchEvents();
    } catch (error) {
      this.logger.error('OpenWeb Ninja ingestion failed', error);
    }

    let ticketmasterEvents: Prisma.EventCreateInput[] = [];
    try {
      ticketmasterEvents = await this.ticketmasterProvider.fetchEvents();
    } catch (error) {
      this.logger.error('Ticketmaster ingestion failed', error);
    }

    let eventbriteEvents: Prisma.EventCreateInput[] = [];
    try {
      eventbriteEvents = await this.eventbriteProvider.fetchEvents();
    } catch (error) {
      this.logger.error('Eventbrite ingestion failed', error);
    }

    let goodnightEvents: Prisma.EventCreateInput[] = [];
    try {
      goodnightEvents = await this.goodnightProvider.fetchEvents();
    } catch (error) {
      this.logger.error('Goodnight.at ingestion failed', error);
    }

    let eventsAtEvents: Prisma.EventCreateInput[] = [];
    try {
      eventsAtEvents = await this.eventsAtProvider.fetchEvents();
    } catch (error) {
      this.logger.error('Events.at ingestion failed', error);
    }

    const combinedEvents = [
      ...stadtWienEvents,
      ...eventfrogEvents,
      ...ninjaEvents,
      ...ticketmasterEvents,
      ...eventbriteEvents,
      ...goodnightEvents,
      ...eventsAtEvents,
    ];
    const deduplicatedEvents = this.deduplicateEvents(combinedEvents);

    const persisted = await this.persistence.saveEvents(deduplicatedEvents);

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

    for (const event of events) {
      const normTitle = this.normalizeTitle(event.title);
      const startMs = new Date(event.startTime).getTime();

      const existingIndex = uniqueEvents.findIndex((existing) => {
        const existingNormTitle = this.normalizeTitle(existing.title);
        const existingStartMs = new Date(existing.startTime).getTime();

        // 1. Title match (either identical or very close substring match)
        const titleMatches =
          existingNormTitle === normTitle ||
          existingNormTitle.includes(normTitle) ||
          normTitle.includes(existingNormTitle);

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

        return titleMatches && timeMatches && venueMatches;
      });

      if (existingIndex === -1) {
        uniqueEvents.push(event);
      } else {
        const existing = uniqueEvents[existingIndex];
        const newScore = this.getEventQualityScore(event);
        const existingScore = this.getEventQualityScore(existing);

        // Prioritize non-scraped, richer events (with photos, official APIs, better metadata)
        if (newScore > existingScore) {
          this.logger.debug(
            `Deduplication: Replaced lower quality event "${existing.title}" (${existing.provider}, score ${existingScore}) with higher quality event from ${event.provider} (score ${newScore}).`,
          );
          uniqueEvents[existingIndex] = event;
        } else {
          this.logger.debug(
            `Deduplication: Kept existing higher/equal quality event "${existing.title}" (${existing.provider}, score ${existingScore}) over ${event.provider} (score ${newScore}).`,
          );
        }
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
      EVENTFROG: 45,
      STADT_WIEN: 40,
      OPENWEB_NINJA: 30,
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
    return title.toLowerCase().replace(/[^a-z0-9]/g, '');
  }
}
