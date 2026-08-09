import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { StadtWienService } from './stadt-wien/stadt-wien.service';
import { EventfrogService } from './eventfrog/eventfrog.service';
import { OpenwebNinjaService } from './openweb-ninja/openweb-ninja.service';
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

    const combinedEvents = [...stadtWienEvents, ...eventfrogEvents, ...ninjaEvents];
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

      const isDuplicate = uniqueEvents.some((existing) => {
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

      if (!isDuplicate) {
        uniqueEvents.push(event);
      } else {
        this.logger.debug(`Deduplicated duplicate event: "${event.title}" from provider ${event.provider}`);
      }
    }

    return uniqueEvents;
  }

  private normalizeTitle(title: string): string {
    return title.toLowerCase().replace(/[^a-z0-9]/g, '');
  }
}
