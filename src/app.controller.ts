import { Controller, Get } from '@nestjs/common';
import { StadtWienService } from './ingestion/stadt-wien/stadt-wien.service';

@Controller('test-ingestion')
export class AppController {
  constructor(private readonly wienService: StadtWienService) {}

  @Get('wien')
  async testWien() {
    const events = await this.wienService.fetchEvents();
    return {
      count: events.length,
      data: events,
    };
  }
}
