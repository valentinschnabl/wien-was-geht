import { Controller, Post } from '@nestjs/common';
import { IngestionResult, IngestionService } from './ingestion.service';

@Controller('ingestion')
export class IngestionController {
  constructor(private readonly ingestionService: IngestionService) {}

  @Post('run')
  async run(): Promise<IngestionResult> {
    return this.ingestionService.run();
  }
}
