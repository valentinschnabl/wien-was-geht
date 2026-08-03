import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EventPersistenceService {
  private readonly logger = new Logger(EventPersistenceService.name);

  constructor(private readonly prisma: PrismaService) {}

  async saveEvents(events: Prisma.EventCreateInput[]): Promise<number> {
    let savedCount = 0;

    for (const event of events) {
      await this.prisma.event.upsert({
        where: {
          externalId_provider: {
            externalId: event.externalId,
            provider: event.provider,
          },
        },
        create: event,
        update: event,
      });
      savedCount += 1;
    }

    return savedCount;
  }

  async pruneExpiredEvents(retentionWindowHours: number): Promise<number> {
    const cutoff = new Date(Date.now() - retentionWindowHours * 60 * 60 * 1000);

    const deleted = await this.prisma.event.deleteMany({
      where: {
        startTime: {
          lt: cutoff,
        },
      },
    });

    this.logger.debug(`Deleted ${deleted.count} expired events.`);

    return deleted.count;
  }
}
