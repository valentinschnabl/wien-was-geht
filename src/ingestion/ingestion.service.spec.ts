import { Test, TestingModule } from '@nestjs/testing';
import { IngestionService } from './ingestion.service';
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
import { AiCategorizerService } from './ai-categorizer/ai-categorizer.service';
import { EventPersistenceService } from './event-persistence.service';

describe('IngestionService', () => {
  let service: IngestionService;
  let stadtWienService: StadtWienService;
  let eventfrogService: EventfrogService;
  let ticketmasterService: TicketmasterService;
  let eventbriteService: EventbriteService;
  let goodnightService: GoodnightService;
  let eventsAtService: EventsAtService;
  let residentAdvisorService: ResidentAdvisorService;
  let capeetService: CapeetService;
  let ohSchonHellService: OhSchonHellService;
  let eintrittFreiService: EintrittFreiService;
  let kultursommerService: KultursommerService;
  let aiCategorizerService: AiCategorizerService;
  let persistenceService: EventPersistenceService;

  const mockStadtWienService = {
    fetchEvents: jest.fn().mockResolvedValue([
      {
        externalId: 'sw-1',
        provider: 'stadt-wien',
        title: 'Event 1',
        startTime: new Date('2026-08-15T12:00:00Z'),
        venueName: 'Venue 1',
        latitude: 48.2082,
        longitude: 16.3738,
      },
    ]),
  };

  const mockEventfrogService = {
    fetchEvents: jest.fn().mockResolvedValue([
      {
        externalId: 'ef-1',
        provider: 'eventfrog',
        title: 'Event 2',
        startTime: new Date('2026-08-15T15:00:00Z'),
        venueName: 'Venue 2',
        latitude: 48.2200,
        longitude: 16.4000,
      },
    ]),
  };

  const mockTicketmasterService = {
    fetchEvents: jest.fn().mockResolvedValue([
      {
        externalId: 'tm-1',
        provider: 'TICKETMASTER',
        title: 'Event 4',
        startTime: new Date('2026-08-15T20:00:00Z'),
        venueName: 'Venue 4',
        latitude: 48.2400,
        longitude: 16.4400,
      },
    ]),
  };

  const mockEventbriteService = {
    fetchEvents: jest.fn().mockResolvedValue([
      {
        externalId: 'eb-1',
        provider: 'EVENTBRITE',
        title: 'Event 5',
        startTime: new Date('2026-08-15T21:00:00Z'),
        venueName: 'Venue 5',
        latitude: 48.2500,
        longitude: 16.4500,
      },
    ]),
  };

  const mockGoodnightService = {
    fetchEvents: jest.fn().mockResolvedValue([
      {
        externalId: 'gn-1',
        provider: 'GOODNIGHT',
        title: 'Event 6',
        startTime: new Date('2026-08-15T22:00:00Z'),
        venueName: 'Venue 6',
        latitude: 48.2000,
        longitude: 16.3600,
      },
    ]),
  };

  const mockEventsAtService = {
    fetchEvents: jest.fn().mockResolvedValue([
      {
        externalId: 'ea-1',
        provider: 'EVENTS_AT',
        title: 'Event 7',
        startTime: new Date('2026-08-15T19:00:00Z'),
        venueName: 'Venue 7',
        latitude: 48.2100,
        longitude: 16.3700,
      },
    ]),
  };

  const mockResidentAdvisorService = {
    fetchEvents: jest.fn().mockResolvedValue([
      {
        externalId: 'ra-1',
        provider: 'RESIDENT_ADVISOR',
        title: 'Event 8',
        startTime: new Date('2026-08-15T23:00:00Z'),
        venueName: 'Venue 8',
        latitude: 48.2150,
        longitude: 16.3800,
      },
    ]),
  };

  const mockCapeetService = {
    fetchEvents: jest.fn().mockResolvedValue([
      {
        externalId: 'capeet-1',
        provider: 'CAPEET',
        title: 'Event 9',
        startTime: new Date('2026-08-15T20:00:00Z'),
        venueName: 'Arena, Wien',
        latitude: 48.1883,
        longitude: 16.4136,
      },
    ]),
  };

  const mockOhSchonHellService = {
    fetchEvents: jest.fn().mockResolvedValue([
      {
        externalId: 'osh-1',
        provider: 'OH_SCHON_HELL',
        title: 'Event 10',
        startTime: new Date('2026-08-15T22:00:00Z'),
        venueName: 'SASS Music Club',
        latitude: 48.2009,
        longitude: 16.3692,
      },
    ]),
  };

  const mockEintrittFreiService = {
    fetchEvents: jest.fn().mockResolvedValue([
      {
        externalId: 'efrei-1',
        provider: 'EINTRITT_FREI',
        title: 'Event 11',
        startTime: new Date('2026-08-15T19:30:00Z'),
        venueName: 'Donaupark',
        latitude: 48.2415,
        longitude: 16.4172,
      },
    ]),
  };

  const mockKultursommerService = {
    fetchEvents: jest.fn().mockResolvedValue([
      {
        externalId: 'ks-1',
        provider: 'KULTURSOMMER',
        title: 'Event 12',
        startTime: new Date('2026-08-15T18:30:00Z'),
        venueName: 'Reithofferpark, 15. Bezirk',
        latitude: 48.1957,
        longitude: 16.3282,
      },
    ]),
  };

  const mockAiCategorizerService = {
    categorizeEvents: jest.fn().mockImplementation((events) => Promise.resolve(events)),
  };

  const mockPersistenceService = {
    saveEvents: jest.fn().mockResolvedValue(11),
    pruneExpiredEvents: jest.fn().mockResolvedValue(3),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IngestionService,
        { provide: StadtWienService, useValue: mockStadtWienService },
        { provide: EventfrogService, useValue: mockEventfrogService },
        { provide: TicketmasterService, useValue: mockTicketmasterService },
        { provide: EventbriteService, useValue: mockEventbriteService },
        { provide: GoodnightService, useValue: mockGoodnightService },
        { provide: EventsAtService, useValue: mockEventsAtService },
        { provide: ResidentAdvisorService, useValue: mockResidentAdvisorService },
        { provide: CapeetService, useValue: mockCapeetService },
        { provide: OhSchonHellService, useValue: mockOhSchonHellService },
        { provide: EintrittFreiService, useValue: mockEintrittFreiService },
        { provide: KultursommerService, useValue: mockKultursommerService },
        { provide: AiCategorizerService, useValue: mockAiCategorizerService },
        { provide: EventPersistenceService, useValue: mockPersistenceService },
      ],
    }).compile();

    service = module.get<IngestionService>(IngestionService);
    stadtWienService = module.get<StadtWienService>(StadtWienService);
    eventfrogService = module.get<EventfrogService>(EventfrogService);
    ticketmasterService = module.get<TicketmasterService>(TicketmasterService);
    eventbriteService = module.get<EventbriteService>(EventbriteService);
    goodnightService = module.get<GoodnightService>(GoodnightService);
    eventsAtService = module.get<EventsAtService>(EventsAtService);
    residentAdvisorService = module.get<ResidentAdvisorService>(ResidentAdvisorService);
    capeetService = module.get<CapeetService>(CapeetService);
    ohSchonHellService = module.get<OhSchonHellService>(OhSchonHellService);
    eintrittFreiService = module.get<EintrittFreiService>(EintrittFreiService);
    aiCategorizerService = module.get<AiCategorizerService>(AiCategorizerService);
    persistenceService = module.get<EventPersistenceService>(EventPersistenceService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('run', () => {
    it('should trigger ingestion across providers and persist results', async () => {
      const summary = await service.run();

      expect(summary).toBeDefined();
      expect(summary.fetched).toBe(11);
      expect(summary.persisted).toBe(11);
      expect(summary.pruned).toBe(3);

      expect(persistenceService.pruneExpiredEvents).toHaveBeenCalledWith(48);
      expect(stadtWienService.fetchEvents).toHaveBeenCalled();
      expect(eventfrogService.fetchEvents).toHaveBeenCalled();
      expect(ticketmasterService.fetchEvents).toHaveBeenCalled();
      expect(eventbriteService.fetchEvents).toHaveBeenCalled();
      expect(goodnightService.fetchEvents).toHaveBeenCalled();
      expect(eventsAtService.fetchEvents).toHaveBeenCalled();
      expect(residentAdvisorService.fetchEvents).toHaveBeenCalled();
      expect(capeetService.fetchEvents).toHaveBeenCalled();
      expect(ohSchonHellService.fetchEvents).toHaveBeenCalled();
      expect(eintrittFreiService.fetchEvents).toHaveBeenCalled();
      expect(mockKultursommerService.fetchEvents).toHaveBeenCalled();
      expect(aiCategorizerService.categorizeEvents).toHaveBeenCalled();
      expect(persistenceService.saveEvents).toHaveBeenCalled();
    });

    it('should deduplicate close duplicates across providers', async () => {
      // Mock duplicate events
      mockStadtWienService.fetchEvents.mockResolvedValueOnce([
        {
          externalId: 'sw-dup',
          provider: 'STADT_WIEN',
          title: 'Wien Konzert',
          startTime: new Date('2026-08-15T20:00:00Z'),
          venueName: 'Stadthalle',
          latitude: 48.2019,
          longitude: 16.3376,
        },
      ]);
      mockEventfrogService.fetchEvents.mockResolvedValueOnce([
        {
          externalId: 'ef-dup',
          provider: 'EVENTFROG',
          title: 'Wien-Konzert!', // Slight difference
          startTime: new Date('2026-08-15T20:15:00Z'), // 15 mins diff
          venueName: 'Wiener Stadthalle', // Slight difference
          latitude: 48.2020,
          longitude: 16.3378, // Tiny coordinate diff
        },
      ]);
      mockTicketmasterService.fetchEvents.mockResolvedValueOnce([]);
      mockEventbriteService.fetchEvents.mockResolvedValueOnce([]);
      mockGoodnightService.fetchEvents.mockResolvedValueOnce([]);
      mockEventsAtService.fetchEvents.mockResolvedValueOnce([]);
      mockResidentAdvisorService.fetchEvents.mockResolvedValueOnce([]);

      await service.run();

      // Should save only 1 event due to deduplication, prioritizing Eventfrog (ticketing provider) over basic Stadt Wien
      expect(persistenceService.saveEvents).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ externalId: 'ef-dup' }),
        ]),
      );
      // Stadt Wien duplicate should be replaced by higher priority Eventfrog
      expect(persistenceService.saveEvents).toHaveBeenCalledWith(
        expect.not.arrayContaining([
          expect.objectContaining({ externalId: 'sw-dup' }),
        ]),
      );
    });

    it('should prioritize richer events with photos and official APIs over scraped duplicate events', async () => {
      mockStadtWienService.fetchEvents.mockResolvedValueOnce([]);
      mockEventfrogService.fetchEvents.mockResolvedValueOnce([]);
      mockTicketmasterService.fetchEvents.mockResolvedValueOnce([]);
      mockEventsAtService.fetchEvents.mockResolvedValueOnce([]);
      mockResidentAdvisorService.fetchEvents.mockResolvedValueOnce([]);

      // Eventbrite event with photo, full description, direct ticket link
      mockEventbriteService.fetchEvents.mockResolvedValueOnce([
        {
          externalId: 'eb-rich',
          provider: 'EVENTBRITE',
          title: 'Sommer Techno Party',
          startTime: new Date('2026-08-15T22:00:00Z'),
          venueName: 'Sass Club',
          latitude: 48.2000,
          longitude: 16.3700,
          imageUrl: 'https://cdn.example.com/event.jpg',
          description: 'A very rich and detailed event description with lots of information',
          url: 'https://eventbrite.com/e/12345',
        },
      ]);

      // Goodnight scraped event without photo and short description
      mockGoodnightService.fetchEvents.mockResolvedValueOnce([
        {
          externalId: 'gn-scraped',
          provider: 'GOODNIGHT',
          title: 'Sommer Techno Party',
          startTime: new Date('2026-08-15T22:00:00Z'),
          venueName: 'Sass Music Club',
          latitude: 48.2001,
          longitude: 16.3701,
          imageUrl: null,
          description: 'Short',
          url: 'https://goodnight.at/events/party',
        },
      ]);

      await service.run();

      // Should prioritize the rich Eventbrite event with photo
      expect(persistenceService.saveEvents).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ externalId: 'eb-rich', provider: 'EVENTBRITE' }),
        ]),
      );
      // Lower quality scraped duplicate should be excluded
      expect(persistenceService.saveEvents).toHaveBeenCalledWith(
        expect.not.arrayContaining([
          expect.objectContaining({ externalId: 'gn-scraped' }),
        ]),
      );
    });
  });
});
