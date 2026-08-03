import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { OpenwebNinjaService } from './openweb-ninja/openweb-ninja.service';
import { StadtWienService } from './stadt-wien/stadt-wien.service';
import { PrismaService } from '../prisma/prisma.service';
import { EventPersistenceService } from './event-persistence.service';
import { IngestionService } from './ingestion.service';
import { IngestionController } from './ingestion.controller';

@Module({
  imports: [HttpModule],
  controllers: [IngestionController],
  providers: [
    PrismaService,
    OpenwebNinjaService,
    StadtWienService,
    EventPersistenceService,
    IngestionService,
  ],
  exports: [OpenwebNinjaService, StadtWienService, IngestionService],
})
export class IngestionModule {}
