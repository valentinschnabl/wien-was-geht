import { Test, TestingModule } from '@nestjs/testing';
import { IngestionService } from './ingestion.service';
import { StadtWienService } from './stadt-wien/stadt-wien.service';
import { EventPersistenceService } from './event-persistence.service';

describe('IngestionService', () => {
  let service: IngestionService;
  let stadtWienService: StadtWienService;
  let persistenceService: EventPersistenceService;

  const mockStadtWienService = {
    fetchEvents: jest.fn().mockResolvedValue([
      {
        externalId: 'sw-1',
        provider: 'stadt-wien',
        title: 'Event 1',
      },
    ]),
  };

  const mockPersistenceService = {
    saveEvents: jest.fn().mockResolvedValue(1),
    pruneExpiredEvents: jest.fn().mockResolvedValue(3),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IngestionService,
        { provide: StadtWienService, useValue: mockStadtWienService },
        { provide: EventPersistenceService, useValue: mockPersistenceService },
      ],
    }).compile();

    service = module.get<IngestionService>(IngestionService);
    stadtWienService = module.get<StadtWienService>(StadtWienService);
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
      expect(summary.fetched).toBe(1);
      expect(summary.persisted).toBe(1);
      expect(summary.pruned).toBe(3);

      expect(persistenceService.pruneExpiredEvents).toHaveBeenCalledWith(24);
      expect(stadtWienService.fetchEvents).toHaveBeenCalled();
      expect(persistenceService.saveEvents).toHaveBeenCalled();
    });
  });
});
