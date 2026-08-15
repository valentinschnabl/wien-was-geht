import { Test, TestingModule } from '@nestjs/testing';
import { IngestionService } from './ingestion.service';
import { StadtWienService } from './stadt-wien/stadt-wien.service';
import { EventfrogService } from './eventfrog/eventfrog.service';
import { OpenwebNinjaService } from './openweb-ninja/openweb-ninja.service';
import { TicketmasterService } from './ticketmaster/ticketmaster.service';
import { EventbriteService } from './eventbrite/eventbrite.service';
import { GoodnightService } from './goodnight/goodnight.service';
import { EventsAtService } from './events-at/events-at.service';
import { EventPersistenceService } from './event-persistence.service';

describe('IngestionService', () => {
  let service: IngestionService;
  let stadtWienService: StadtWienService;
  let eventfrogService: EventfrogService;
  let ninjaService: OpenwebNinjaService;
  let ticketmasterService: TicketmasterService;
  let eventbriteService: EventbriteService;
  let goodnightService: GoodnightService;
  let eventsAtService: EventsAtService;
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

  const mockNinjaService = {
    fetchEvents: jest.fn().mockResolvedValue([
      {
        externalId: 'nj-1',
        provider: 'OPENWEB_NINJA',
        title: 'Event 3',
        startTime: new Date('2026-08-15T18:00:00Z'),
        venueName: 'Venue 3',
        latitude: 48.2300,
        longitude: 16.4200,
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
        latitude: 48.2600,
        longitude: 16.4600,
      },
    ]),
  };

  const mockEventsAtService = {
    fetchEvents: jest.fn().mockResolvedValue([
      {
        externalId: 'ea-1',
        provider: 'EVENTS_AT',
        title: 'Event 7',
        startTime: new Date('2026-08-15T23:00:00Z'),
        venueName: 'Venue 7',
        latitude: 48.2700,
        longitude: 16.4700,
      },
    ]),
  };

  const mockPersistenceService = {
    saveEvents: jest.fn().mockResolvedValue(7),
    pruneExpiredEvents: jest.fn().mockResolvedValue(3),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IngestionService,
        { provide: StadtWienService, useValue: mockStadtWienService },
        { provide: EventfrogService, useValue: mockEventfrogService },
        { provide: OpenwebNinjaService, useValue: mockNinjaService },
        { provide: TicketmasterService, useValue: mockTicketmasterService },
        { provide: EventbriteService, useValue: mockEventbriteService },
        { provide: GoodnightService, useValue: mockGoodnightService },
        { provide: EventsAtService, useValue: mockEventsAtService },
        { provide: EventPersistenceService, useValue: mockPersistenceService },
      ],
    }).compile();

    service = module.get<IngestionService>(IngestionService);
    stadtWienService = module.get<StadtWienService>(StadtWienService);
    eventfrogService = module.get<EventfrogService>(EventfrogService);
    ninjaService = module.get<OpenwebNinjaService>(OpenwebNinjaService);
    ticketmasterService = module.get<TicketmasterService>(TicketmasterService);
    eventbriteService = module.get<EventbriteService>(EventbriteService);
    goodnightService = module.get<GoodnightService>(GoodnightService);
    eventsAtService = module.get<EventsAtService>(EventsAtService);
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
      expect(summary.fetched).toBe(7);
      expect(summary.persisted).toBe(7);
      expect(summary.pruned).toBe(3);

      expect(persistenceService.pruneExpiredEvents).toHaveBeenCalledWith(24);
      expect(stadtWienService.fetchEvents).toHaveBeenCalled();
      expect(eventfrogService.fetchEvents).toHaveBeenCalled();
      expect(ninjaService.fetchEvents).toHaveBeenCalled();
      expect(ticketmasterService.fetchEvents).toHaveBeenCalled();
      expect(eventbriteService.fetchEvents).toHaveBeenCalled();
      expect(goodnightService.fetchEvents).toHaveBeenCalled();
      expect(eventsAtService.fetchEvents).toHaveBeenCalled();
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
      mockNinjaService.fetchEvents.mockResolvedValueOnce([]);
      mockTicketmasterService.fetchEvents.mockResolvedValueOnce([]);
      mockEventbriteService.fetchEvents.mockResolvedValueOnce([]);
      mockGoodnightService.fetchEvents.mockResolvedValueOnce([]);
      mockEventsAtService.fetchEvents.mockResolvedValueOnce([]);

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
      mockNinjaService.fetchEvents.mockResolvedValueOnce([]);
      mockTicketmasterService.fetchEvents.mockResolvedValueOnce([]);
      mockEventsAtService.fetchEvents.mockResolvedValueOnce([]);

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
