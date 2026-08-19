import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { StadtWienService } from './stadt-wien/stadt-wien.service';
import { EventfrogService } from './eventfrog/eventfrog.service';
import { TicketmasterService } from './ticketmaster/ticketmaster.service';
import { EventbriteService } from './eventbrite/eventbrite.service';
import { GoodnightService } from './goodnight/goodnight.service';
import { EventsAtService } from './events-at/events-at.service';
import { ResidentAdvisorService } from './resident-advisor/resident-advisor.service';
import { CapeetService } from './capeet/capeet.service';
import { OhSchonHellService } from './oh-schon-hell/oh-schon-hell.service';
import { EintrittFreiService } from './eintritt-frei/eintritt-frei.service';
import { KultursommerService } from './kultursommer/kultursommer.service';
import { LumaService } from './luma/luma.service';
import { ViennaClubsService } from './vienna-clubs/vienna-clubs.service';
import { RausgegangenService } from './rausgegangen/rausgegangen.service';
import { WardaService } from './warda/warda.service';
import { PartytimerService } from './partytimer/partytimer.service';
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
    StadtWienService,
    EventfrogService,
    TicketmasterService,
    EventbriteService,
    GoodnightService,
    EventsAtService,
    ResidentAdvisorService,
    CapeetService,
    OhSchonHellService,
    EintrittFreiService,
    KultursommerService,
    LumaService,
    ViennaClubsService,
    RausgegangenService,
    WardaService,
    PartytimerService,
    AiCategorizerService,
    EventPersistenceService,
    IngestionService,
  ],
  exports: [
    StadtWienService,
    EventfrogService,
    TicketmasterService,
    EventbriteService,
    GoodnightService,
    EventsAtService,
    ResidentAdvisorService,
    CapeetService,
    OhSchonHellService,
    EintrittFreiService,
    KultursommerService,
    LumaService,
    ViennaClubsService,
    RausgegangenService,
    WardaService,
    PartytimerService,
    AiCategorizerService,
    IngestionService,
  ],
})
export class IngestionModule {}
