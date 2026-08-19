import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EventPersistenceService {
  private readonly logger = new Logger(EventPersistenceService.name);

  constructor(private readonly prisma: PrismaService) {}

  async saveEvents(events: Prisma.EventCreateInput[]): Promise<number> {
    let savedCount = 0;
    const chunkSize = 30; // Run 30 upserts in parallel per batch

    for (let i = 0; i < events.length; i += chunkSize) {
      const chunk = events.slice(i, i + chunkSize);
      const results = await Promise.allSettled(
        chunk.map((event) =>
          this.prisma.event.upsert({
            where: {
              externalId_provider: {
                externalId: event.externalId,
                provider: event.provider,
              },
            },
            create: event,
            update: event,
          }),
        ),
      );
      for (const result of results) {
        if (result.status === 'fulfilled') {
          savedCount++;
        } else {
          this.logger.warn(`Failed to upsert event: ${result.reason?.message || result.reason}`);
        }
      }
    }

    // Auto-clean any cross-provider duplicates in database
    await this.deduplicateDatabaseEvents();

    return savedCount;
  }

  async pruneExpiredEvents(retentionWindowHours: number): Promise<number> {
    const cutoff = new Date(Date.now() - retentionWindowHours * 60 * 60 * 1000);

    const deleted = await this.prisma.event.deleteMany({
      where: {
        OR: [
          {
            endTime: {
              not: null,
              lt: cutoff,
            },
          },
          {
            endTime: null,
            startTime: {
              lt: cutoff,
            },
          },
        ],
      },
    });

    this.logger.debug(`Deleted ${deleted.count} expired events.`);

    return deleted.count;
  }

  async deduplicateDatabaseEvents(): Promise<number> {
    const allEvents = await this.prisma.event.findMany({
      orderBy: { startTime: 'asc' },
    });

    const toDeleteIds: string[] = [];
    const processedIds = new Set<string>();

    const normalize = (t: string) => t.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');

    for (let i = 0; i < allEvents.length; i++) {
      const e1 = allEvents[i];
      if (processedIds.has(e1.id)) continue;

      const norm1 = normalize(e1.title);
      const start1 = new Date(e1.startTime).getTime();

      for (let j = i + 1; j < allEvents.length; j++) {
        const e2 = allEvents[j];
        if (processedIds.has(e2.id)) continue;

        const norm2 = normalize(e2.title);
        const start2 = new Date(e2.startTime).getTime();

        const titleMatch = norm1 === norm2 || norm1.includes(norm2) || norm2.includes(norm1);
        const timeMatch = Math.abs(start1 - start2) <= 90 * 60 * 1000;

        const venueMatch =
          (e1.venueName &&
            e2.venueName &&
            (e1.venueName.toLowerCase().includes(e2.venueName.toLowerCase()) ||
              e2.venueName.toLowerCase().includes(e1.venueName.toLowerCase()))) ||
          (e1.latitude !== 0 &&
            e2.latitude !== 0 &&
            Math.abs(e1.latitude - e2.latitude) < 0.008 &&
            Math.abs(e1.longitude - e2.longitude) < 0.008);

        if (titleMatch && timeMatch && venueMatch) {
          const score1 = (e1.imageUrl ? 30 : 0) + (e1.provider === 'EVENTBRITE' ? 50 : e1.provider === 'EVENTFROG' ? 45 : 30);
          const score2 = (e2.imageUrl ? 30 : 0) + (e2.provider === 'EVENTBRITE' ? 50 : e2.provider === 'EVENTFROG' ? 45 : 30);

          if (score1 >= score2) {
            toDeleteIds.push(e2.id);
            processedIds.add(e2.id);
          } else {
            toDeleteIds.push(e1.id);
            processedIds.add(e1.id);
          }
        }
      }
    }

    if (toDeleteIds.length > 0) {
      await this.prisma.event.deleteMany({
        where: { id: { in: toDeleteIds } },
      });
      this.logger.log(`Purged ${toDeleteIds.length} cross-provider duplicate events from database.`);
    }

    return toDeleteIds.length;
  }
}
