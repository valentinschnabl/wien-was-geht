import { HttpModule } from '@nestjs/axios';
import { Test, TestingModule } from '@nestjs/testing';
import { FalterService } from './falter.service';

describe('FalterService', () => {
  let service: FalterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [HttpModule],
      providers: [FalterService],
    }).compile();

    service = module.get<FalterService>(FalterService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
