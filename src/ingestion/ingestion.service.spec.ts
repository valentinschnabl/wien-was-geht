import { Test, TestingModule } from '@nestjs/testing';
import { IngestionService } from './ingestion.service';
import { StadtWienService } from './stadt-wien/stadt-wien.service';
import { EventfrogService } from './eventfrog/eventfrog.service';
import { OpenwebNinjaService } from './openweb-ninja/openweb-ninja.service';
import { GoodnightService } from './goodnight/goodnight.service';
import { FalterService } from './falter/falter.service';
import { EventPersistenceService } from './event-persistence.service';

describe('IngestionService', () => {
  let service: IngestionService;
  let stadtWienService: StadtWienService;
  let eventfrogService: EventfrogService;
  let ninjaService: OpenwebNinjaService;
  let goodnightService: GoodnightService;
  let falterService: FalterService;
  let persistenceService: EventPersistenceService;

  const mockStadtWienService = {
    fetchEvents: jest.fn().mockResolvedValue([
      {
        externalId: 'sw-1',
        provider: 'stadt-wien',
        title: 'Event 1',
        startTime: new Date('2026-08-09T12:00:00Z'),
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
        startTime: new Date('2026-08-09T15:00:00Z'),
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
        startTime: new Date('2026-08-09T18:00:00Z'),
        venueName: 'Venue 3',
        latitude: 48.2300,
        longitude: 16.4200,
      },
    ]),
  };

  const mockGoodnightService = {
    fetchEvents: jest.fn().mockResolvedValue([
      {
        externalId: 'gn-1',
        provider: 'GOODNIGHT',
        title: 'Event 4',
        startTime: new Date('2026-08-09T20:00:00Z'),
        venueName: 'Venue 4',
        latitude: 48.2400,
        longitude: 16.4400,
      },
    ]),
  };

  const mockFalterService = {
    fetchEvents: jest.fn().mockResolvedValue([
      {
        externalId: 'fl-1',
        provider: 'FALTER',
        title: 'Event 5',
        startTime: new Date('2026-08-09T22:00:00Z'),
        venueName: 'Venue 5',
        latitude: 48.2500,
        longitude: 16.4600,
      },
    ]),
  };

  const mockPersistenceService = {
    saveEvents: jest.fn().mockResolvedValue(5),
    pruneExpiredEvents: jest.fn().mockResolvedValue(3),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IngestionService,
        { provide: StadtWienService, useValue: mockStadtWienService },
        { provide: EventfrogService, useValue: mockEventfrogService },
        { provide: OpenwebNinjaService, useValue: mockNinjaService },
        { provide: GoodnightService, useValue: mockGoodnightService },
        { provide: FalterService, useValue: mockFalterService },
        { provide: EventPersistenceService, useValue: mockPersistenceService },
      ],
    }).compile();

    service = module.get<IngestionService>(IngestionService);
    stadtWienService = module.get<StadtWienService>(StadtWienService);
    eventfrogService = module.get<EventfrogService>(EventfrogService);
    ninjaService = module.get<OpenwebNinjaService>(OpenwebNinjaService);
    goodnightService = module.get<GoodnightService>(GoodnightService);
    falterService = module.get<FalterService>(FalterService);
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
      expect(summary.fetched).toBe(5);
      expect(summary.persisted).toBe(5);
      expect(summary.pruned).toBe(3);

      expect(persistenceService.pruneExpiredEvents).toHaveBeenCalledWith(24);
      expect(stadtWienService.fetchEvents).toHaveBeenCalled();
      expect(eventfrogService.fetchEvents).toHaveBeenCalled();
      expect(ninjaService.fetchEvents).toHaveBeenCalled();
      expect(goodnightService.fetchEvents).toHaveBeenCalled();
      expect(falterService.fetchEvents).toHaveBeenCalled();
      expect(persistenceService.saveEvents).toHaveBeenCalled();
    });

    it('should deduplicate close duplicates across providers', async () => {
      // Mock duplicate events
      mockStadtWienService.fetchEvents.mockResolvedValueOnce([
        {
          externalId: 'sw-dup',
          provider: 'STADT_WIEN',
          title: 'Wien Konzert',
          startTime: new Date('2026-08-09T20:00:00Z'),
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
          startTime: new Date('2026-08-09T20:15:00Z'), // 15 mins diff
          venueName: 'Wiener Stadthalle', // Slight difference
          latitude: 48.2020,
          longitude: 16.3378, // Tiny coordinate diff
        },
      ]);
      mockNinjaService.fetchEvents.mockResolvedValueOnce([]);
      mockGoodnightService.fetchEvents.mockResolvedValueOnce([]);
      mockFalterService.fetchEvents.mockResolvedValueOnce([]);

      await service.run();

      // Should save only 1 event due to deduplication
      expect(persistenceService.saveEvents).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ externalId: 'sw-dup' }),
        ]),
      );
      // Eventfrog duplicate should be filtered out
      expect(persistenceService.saveEvents).toHaveBeenCalledWith(
        expect.not.arrayContaining([
          expect.objectContaining({ externalId: 'ef-dup' }),
        ]),
      );
    });
  });
});
