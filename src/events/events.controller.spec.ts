import { Test, TestingModule } from '@nestjs/testing';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';

describe('EventsController', () => {
  let controller: EventsController;
  let service: EventsService;

  const mockEventsResponse = {
    data: [
      {
        id: '1',
        title: 'Donauinselfest 2026',
        venueName: 'Donauinsel',
        latitude: 48.232,
        longitude: 16.415,
      },
    ],
    count: 1,
    limit: 100,
    offset: 0,
  };

  const mockEventsService = {
    findAll: jest.fn().mockResolvedValue(mockEventsResponse),
    findOne: jest.fn().mockImplementation((id: string) => {
      if (id === '1') {
        return Promise.resolve(mockEventsResponse.data[0]);
      }
      return Promise.resolve(null);
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventsController],
      providers: [{ provide: EventsService, useValue: mockEventsService }],
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
      const res = await controller.findAll('50', '10', 'stadt-wien', 'Music');

      expect(res).toEqual(mockEventsResponse);
      expect(service.findAll).toHaveBeenCalledWith(50, 10, {
        provider: 'stadt-wien',
        category: 'Music',
      });
    });

    it('should fallback to default limit and offset if invalid strings supplied', async () => {
      await controller.findAll('invalid', 'bad-offset');

      expect(service.findAll).toHaveBeenCalledWith(100, 0, {
        provider: undefined,
        category: undefined,
      });
    });

    it('should clamp excessive limits to max allowed value (500)', async () => {
      await controller.findAll('2000', '0');

      expect(service.findAll).toHaveBeenCalledWith(500, 0, {
        provider: undefined,
        category: undefined,
      });
    });
  });

  describe('findOne', () => {
    it('should delegate to EventsService.findOne with ID', async () => {
      const res = await controller.findOne('1');
      expect(res).toEqual(mockEventsResponse.data[0]);
      expect(service.findOne).toHaveBeenCalledWith('1');
    });

    it('should return null if non-existent ID requested', async () => {
      const res = await controller.findOne('non-existent');
      expect(res).toBeNull();
    });
  });
});
