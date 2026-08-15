import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface EventFilters {
  provider?: string;
  category?: string;
  today?: boolean;
}

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    limit = 500,
    offset = 0,
    filters: EventFilters = {},
  ): Promise<{
    data: Prisma.EventGetPayload<Record<string, never>>[];
    count: number;
    limit: number;
    offset: number;
  }> {
    const where: Prisma.EventWhereInput = {};

    if (filters.provider) {
      where.provider = filters.provider;
    }

    if (filters.category) {
      where.category = filters.category;
    }

    if (filters.today) {
      const now = new Date();
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(now);
      todayEnd.setHours(23, 59, 59, 999);

      where.AND = [
        { startTime: { lte: todayEnd } },
        {
          OR: [
            { endTime: { gte: todayStart } },
            { endTime: null, startTime: { gte: todayStart } },
          ],
        },
      ];
    }

    const [data, count] = await this.prisma.$transaction([
      this.prisma.event.findMany({
        where,
        orderBy: { startTime: 'asc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.event.count({ where }),
    ]);

    return {
      data,
      count,
      limit,
      offset,
    };
  }

  async findOne(id: string) {
    return this.prisma.event.findUnique({ where: { id } });
  }
}
