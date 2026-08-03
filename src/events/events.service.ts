import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface EventFilters {
  provider?: string;
  category?: string;
}

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    limit = 100,
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
