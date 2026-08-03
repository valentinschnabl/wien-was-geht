import { Injectable, Logger } from '@nestjs/common';
import { StadtWienService } from './stadt-wien/stadt-wien.service';
import { EventPersistenceService } from './event-persistence.service';

export interface IngestionResult {
  fetched: number;
  persisted: number;
  pruned: number;
}

@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);
  private readonly retentionWindowHours = 24;

  constructor(
    private readonly provider: StadtWienService,
    private readonly persistence: EventPersistenceService,
  ) {}

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
