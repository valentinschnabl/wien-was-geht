import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface EventFilters {
  provider?: string;
  category?: string;
  today?: boolean;
  date?: string;
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

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    const tomorrowStart = new Date(now);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    tomorrowStart.setHours(0, 0, 0, 0);
    const tomorrowEnd = new Date(now);
    tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);
    tomorrowEnd.setHours(23, 59, 59, 999);

    if (filters.date === 'tomorrow') {
      where.AND = [
        { startTime: { lte: tomorrowEnd } },
        {
          OR: [
            { endTime: { gte: tomorrowStart } },
            { endTime: null, startTime: { gte: tomorrowStart } },
          ],
        },
      ];
    } else if (filters.date === 'today' || filters.today) {
      where.AND = [
        { startTime: { lte: todayEnd } },
        {
          OR: [
            { endTime: { gte: todayStart } },
            { endTime: null, startTime: { gte: todayStart } },
          ],
        },
      ];
    } else if (filters.date === 'all') {
      // No date bounds
    } else {
      // Default: 48h active window (Today & Tomorrow)
      where.AND = [
        { startTime: { lte: tomorrowEnd } },
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
