import { HttpModule } from '@nestjs/axios';
import { Test, TestingModule } from '@nestjs/testing';
import { EventfrogService } from './eventfrog.service';

describe('EventfrogService', () => {
  let service: EventfrogService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [HttpModule],
      providers: [EventfrogService],
    }).compile();

    service = module.get<EventfrogService>(EventfrogService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
