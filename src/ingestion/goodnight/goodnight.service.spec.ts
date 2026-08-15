import { HttpModule } from '@nestjs/axios';
import { Test, TestingModule } from '@nestjs/testing';
import { GoodnightService } from './goodnight.service';

describe('GoodnightService', () => {
  let service: GoodnightService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [HttpModule],
      providers: [GoodnightService],
    }).compile();

    service = module.get<GoodnightService>(GoodnightService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
