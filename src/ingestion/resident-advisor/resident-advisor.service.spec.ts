import { HttpModule } from '@nestjs/axios';
import { Test, TestingModule } from '@nestjs/testing';
import { ResidentAdvisorService } from './resident-advisor.service';

describe('ResidentAdvisorService', () => {
  let service: ResidentAdvisorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [HttpModule],
      providers: [ResidentAdvisorService],
    }).compile();

    service = module.get<ResidentAdvisorService>(ResidentAdvisorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
