import { HttpModule } from '@nestjs/axios';
import { Test, TestingModule } from '@nestjs/testing';
import { OpenwebNinjaService } from './openweb-ninja.service';

describe('OpenwebNinjaService', () => {
  let service: OpenwebNinjaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [HttpModule],
      providers: [OpenwebNinjaService],
    }).compile();

    service = module.get<OpenwebNinjaService>(OpenwebNinjaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
