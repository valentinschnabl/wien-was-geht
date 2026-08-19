import {
  Controller,
  Post,
  Headers,
  UnauthorizedException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { IngestionResult, IngestionService } from './ingestion.service';

@Controller('ingestion')
export class IngestionController {
  constructor(private readonly ingestionService: IngestionService) {}

  @Post('run')
  @HttpCode(HttpStatus.OK)
  async run(
    @Headers('x-admin-key') adminKey?: string,
  ): Promise<IngestionResult> {
    const requiredSecret = process.env.INGESTION_ADMIN_SECRET;

    // Enforce admin secret if configured in environment
    if (requiredSecret && adminKey !== requiredSecret) {
      throw new UnauthorizedException('Invalid or missing x-admin-key header');
    }

    return this.ingestionService.run();
  }
}
