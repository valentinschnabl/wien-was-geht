import { Controller, Get, Param, Query } from '@nestjs/common';
import { EventsService } from './events.service';

@Controller('api/v1/events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  async findAll(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('provider') provider?: string,
    @Query('category') category?: string,
    @Query('today') today?: string,
    @Query('date') date?: string,
    @Query('free') free?: string,
  ) {
    const parsedLimit = this.parsePositiveInt(limit, 500, 2000);
    const parsedOffset = this.parseNonNegativeInt(offset, 0);
    const isToday = today === 'true' || today === '1';
    const isFree = free === 'true' || free === '1';

    return this.eventsService.findAll(parsedLimit, parsedOffset, {
      provider,
      category,
      today: isToday,
      date,
      free: isFree ? true : undefined,
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.eventsService.findOne(id);
  }

  private parsePositiveInt(
    input: string | undefined,
    fallback: number,
    max: number,
  ) {
    const parsed = Number(input ?? fallback);

    if (!Number.isFinite(parsed) || parsed < 1) {
      return fallback;
    }

    return Math.min(parsed, max);
  }

  private parseNonNegativeInt(input: string | undefined, fallback: number) {
    const parsed = Number(input ?? fallback);

    if (!Number.isFinite(parsed) || parsed < 0) {
      return fallback;
    }

    return parsed;
  }
}
