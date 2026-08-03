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
  ) {
    const parsedLimit = this.parsePositiveInt(limit, 100, 500);
    const parsedOffset = this.parseNonNegativeInt(offset, 0);

    return this.eventsService.findAll(parsedLimit, parsedOffset, {
      provider,
      category,
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
