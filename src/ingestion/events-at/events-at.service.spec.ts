import { HttpModule } from '@nestjs/axios';
import { Test, TestingModule } from '@nestjs/testing';
import { EventsAtService } from './events-at.service';

describe('EventsAtService', () => {
  let service: EventsAtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [HttpModule],
      providers: [EventsAtService],
    }).compile();

    service = module.get<EventsAtService>(EventsAtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
