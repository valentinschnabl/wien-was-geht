import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { StadtWienService } from './stadt-wien/stadt-wien.service';
import { EventPersistenceService } from './event-persistence.service';

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
    private readonly provider: StadtWienService,
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

    const events = await this.provider.fetchEvents();

    const persisted = await this.persistence.saveEvents(events);

    this.logger.log(
      `Ingestion complete. Fetched ${events.length} events, persisted ${persisted}, pruned ${pruned}.`,
    );

    return {
      fetched: events.length,
      persisted,
      pruned,
    };
  }
}
