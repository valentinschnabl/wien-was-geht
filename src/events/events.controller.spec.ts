import { Test, TestingModule } from '@nestjs/testing';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';

describe('EventsController', () => {
  let controller: EventsController;
  let service: EventsService;

  const mockEventsResponse = {
    data: [
      {
        id: '123e4567-e89b-12d3-a456-426614174000',
        externalId: 'ext-1',
        provider: 'stadt-wien',
        title: 'Open Air Concert',
        description: 'A great concert',
        category: 'Music',
        url: 'https://example.com',
        imageUrl: null,
        startTime: new Date('2026-08-15T18:00:00Z'),
        endTime: new Date('2026-08-15T22:00:00Z'),
        venueName: 'Wiener Konzerthaus',
        latitude: 48.201,
        longitude: 16.377,
        geom: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    count: 1,
    limit: 500,
    offset: 0,
  };

  const mockEventsService = {
    findAll: jest.fn().mockResolvedValue(mockEventsResponse),
    findOne: jest.fn().mockResolvedValue(mockEventsResponse.data[0]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventsController],
      providers: [
        {
          provide: EventsService,
          useValue: mockEventsService,
        },
      ],
    }).compile();

    controller = module.get<EventsController>(EventsController);
    service = module.get<EventsService>(EventsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should parse valid query parameters and call EventsService', async () => {
      const res = await controller.findAll(
        '50',
        '10',
        'stadt-wien',
        'Music',
        'true',
      );

      expect(res).toEqual(mockEventsResponse);
      expect(service.findAll).toHaveBeenCalledWith(50, 10, {
        provider: 'stadt-wien',
        category: 'Music',
        today: true,
      });
    });

    it('should fallback to default limit and offset if invalid strings supplied', async () => {
      await controller.findAll('invalid', 'bad-offset');

      expect(service.findAll).toHaveBeenCalledWith(500, 0, {
        provider: undefined,
        category: undefined,
        today: false,
      });
    });

    it('should clamp excessive limits to max allowed value (2000)', async () => {
      await controller.findAll('5000', '0');

      expect(service.findAll).toHaveBeenCalledWith(2000, 0, {
        provider: undefined,
        category: undefined,
        today: false,
      });
    });
  });

  describe('findOne', () => {
    it('should call EventsService.findOne with id', async () => {
      const id = '123e4567-e89b-12d3-a456-426614174000';
      const res = await controller.findOne(id);

      expect(service.findOne).toHaveBeenCalledWith(id);
      expect(res).toEqual(mockEventsResponse.data[0]);
    });
  });
});
