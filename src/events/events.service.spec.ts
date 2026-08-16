import { Test, TestingModule } from '@nestjs/testing';
import { EventsService } from './events.service';
import { PrismaService } from '../prisma/prisma.service';

describe('EventsService', () => {
  let service: EventsService;
  let prisma: PrismaService;

  const mockEvents = [
    {
      id: 'event-1',
      externalId: 'ext-1',
      provider: 'stadt-wien',
      title: 'Konzert im Rathaus',
      description: 'Ein wunderschönes Konzert.',
      category: 'Music',
      url: 'https://example.com/1',
      imageUrl: 'https://example.com/1.jpg',
      startTime: new Date('2026-08-06T18:00:00Z'),
      endTime: new Date('2026-08-06T21:00:00Z'),
      venueName: 'Rathaus Wien',
      latitude: 48.2109,
      longitude: 16.3575,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'event-2',
      externalId: 'ext-2',
      provider: 'openweb-ninja',
      title: 'Kunstausstellung Albertina',
      description: 'Moderne Kunst in Wien.',
      category: 'Culture',
      url: 'https://example.com/2',
      imageUrl: 'https://example.com/2.jpg',
      startTime: new Date('2026-08-06T10:00:00Z'),
      endTime: new Date('2026-08-06T17:00:00Z'),
      venueName: 'Albertina',
      latitude: 48.2047,
      longitude: 16.3682,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const mockPrismaService = {
    $transaction: jest.fn().mockImplementation(async (queries) => {
      return Promise.all(queries);
    }),
    event: {
      findMany: jest.fn().mockResolvedValue(mockEvents),
      count: jest.fn().mockResolvedValue(2),
      findUnique: jest.fn().mockImplementation(({ where }) => {
        const found = mockEvents.find((ev) => ev.id === where.id);
        return Promise.resolve(found ?? null);
      }),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<EventsService>(EventsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated events list with total count', async () => {
      const result = await service.findAll(100, 0, {});

      expect(result).toBeDefined();
      expect(result.data).toHaveLength(2);
      expect(result.count).toBe(2);
      expect(result.limit).toBe(100);
      expect(result.offset).toBe(0);
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should apply provider filter if supplied', async () => {
      await service.findAll(10, 0, { provider: 'stadt-wien' });

      expect(prisma.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ provider: 'stadt-wien' }),
        }),
      );
    });

    it('should apply category filter if supplied', async () => {
      await service.findAll(10, 0, { category: 'Culture' });

      expect(prisma.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ category: 'Culture' }),
        }),
      );
    });

    it('should apply tomorrow date filter if supplied', async () => {
      await service.findAll(10, 0, { date: 'tomorrow' });

      expect(prisma.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ AND: expect.any(Array) }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return event record when found', async () => {
      const result = await service.findOne('event-1');
      expect(result).toBeDefined();
      expect(result?.id).toBe('event-1');
      expect(result?.title).toBe('Konzert im Rathaus');
    });

    it('should return null when event is not found', async () => {
      const result = await service.findOne('non-existent');
      expect(result).toBeNull();
    });
  });
});
