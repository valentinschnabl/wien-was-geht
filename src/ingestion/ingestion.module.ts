import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { OpenwebNinjaService } from './openweb-ninja/openweb-ninja.service';
import { StadtWienService } from './stadt-wien/stadt-wien.service';
import { EventfrogService } from './eventfrog/eventfrog.service';
import { TicketmasterService } from './ticketmaster/ticketmaster.service';
import { EventbriteService } from './eventbrite/eventbrite.service';
import { GoodnightService } from './goodnight/goodnight.service';
import { EventsAtService } from './events-at/events-at.service';
import { ResidentAdvisorService } from './resident-advisor/resident-advisor.service';
import { CapeetService } from './capeet/capeet.service';
import { OhSchonHellService } from './oh-schon-hell/oh-schon-hell.service';
import { AiCategorizerService } from './ai-categorizer/ai-categorizer.service';
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
    EventsAtService,
    ResidentAdvisorService,
    CapeetService,
    OhSchonHellService,
    AiCategorizerService,
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
    EventsAtService,
    ResidentAdvisorService,
    CapeetService,
    OhSchonHellService,
    AiCategorizerService,
    IngestionService,
  ],
})
export class IngestionModule {}
