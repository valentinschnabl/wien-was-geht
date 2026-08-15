import { HttpModule } from '@nestjs/axios';
import { Test, TestingModule } from '@nestjs/testing';
import { AiCategorizerService } from './ai-categorizer.service';

describe('AiCategorizerService', () => {
  let service: AiCategorizerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [HttpModule],
      providers: [AiCategorizerService],
    }).compile();

    service = module.get<AiCategorizerService>(AiCategorizerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should classify keywords correctly in offline fallback mode', () => {
    expect(
      service.classifyWithKeywords('Techno Rave Party', 'Live at Das Werk'),
    ).toBe('Nightlife');
    expect(
      service.classifyWithKeywords('Kasperltheater für Kinder', 'Puppentheater'),
    ).toBe('Family');
    expect(
      service.classifyWithKeywords('Wiener Philharmoniker Konzert', 'Symphonie'),
    ).toBe('Music');
    expect(
      service.classifyWithKeywords('Yoga im Park', 'Outdoor Fitness Workout'),
    ).toBe('Sports');
    expect(
      service.classifyWithKeywords('Weinverkostung', 'Grüner Veltliner Tasting'),
    ).toBe('Culinary');
    expect(
      service.classifyWithKeywords('Stadtführung Wien', 'Historischer Spaziergang'),
    ).toBe('Culture');
  });
});
