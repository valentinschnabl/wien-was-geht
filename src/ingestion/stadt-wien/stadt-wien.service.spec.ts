import { HttpModule } from '@nestjs/axios';
import { Test, TestingModule } from '@nestjs/testing';
import { StadtWienService } from './stadt-wien.service';

describe('StadtWienService', () => {
  let service: StadtWienService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [HttpModule],
      providers: [StadtWienService],
    }).compile();

    service = module.get<StadtWienService>(StadtWienService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
