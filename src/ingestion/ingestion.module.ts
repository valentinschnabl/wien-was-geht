import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { OpenwebNinjaService } from './openweb-ninja/openweb-ninja.service';
import { StadtWienService } from './stadt-wien/stadt-wien.service';
import { EventfrogService } from './eventfrog/eventfrog.service';
import { TicketmasterService } from './ticketmaster/ticketmaster.service';
import { EventbriteService } from './eventbrite/eventbrite.service';
import { GoodnightService } from './goodnight/goodnight.service';
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
    EventfrogService,
    TicketmasterService,
    EventbriteService,
    GoodnightService,
    EventPersistenceService,
    IngestionService,
  ],
  exports: [
    OpenwebNinjaService,
    StadtWienService,
    EventfrogService,
    TicketmasterService,
    EventbriteService,
    GoodnightService,
    IngestionService,
  ],
})
export class IngestionModule {}
