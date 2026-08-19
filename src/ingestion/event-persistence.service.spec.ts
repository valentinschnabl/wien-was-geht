import { Test, TestingModule } from '@nestjs/testing';
import { EventPersistenceService } from './event-persistence.service';
import { PrismaService } from '../prisma/prisma.service';

describe('EventPersistenceService', () => {
  let service: EventPersistenceService;
  let prisma: PrismaService;

  const mockPrismaService = {
    event: {
      findMany: jest.fn().mockResolvedValue([]),
      upsert: jest.fn().mockImplementation(({ create }) => {
        return Promise.resolve({ id: 'generated-id', ...create });
      }),
      deleteMany: jest.fn().mockResolvedValue({ count: 5 }),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventPersistenceService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<EventPersistenceService>(EventPersistenceService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('saveEvents', () => {
    it('should upsert normalized events into database', async () => {
      const itemsToSave = [
        {
          externalId: 'ext-100',
          provider: 'stadt-wien',
          title: 'Wiener Festwochen',
          description: 'Festival im Rathauspark',
          category: 'Culture',
          url: 'https://example.com/festwochen',
          imageUrl: 'https://example.com/image.jpg',
          startTime: new Date('2026-08-06T18:00:00Z'),
          endTime: new Date('2026-08-06T22:00:00Z'),
          venueName: 'Rathauspark',
          latitude: 48.2109,
          longitude: 16.3575,
        },
      ];

      const result = await service.saveEvents(itemsToSave);

      expect(result).toBe(1);
      expect(prisma.event.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            externalId_provider: {
              provider: 'stadt-wien',
              externalId: 'ext-100',
            },
          },
        }),
      );
    });

    it('should return 0 if empty input list provided', async () => {
      const result = await service.saveEvents([]);
      expect(result).toBe(0);
      expect(prisma.event.upsert).not.toHaveBeenCalled();
    });
  });

  describe('pruneExpiredEvents', () => {
    it('should delete events older than specified retention window', async () => {
      const count = await service.pruneExpiredEvents(24);
      expect(count).toBe(5);
      expect(prisma.event.deleteMany).toHaveBeenCalled();
    });
  });
});
