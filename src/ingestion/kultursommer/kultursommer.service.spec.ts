import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { KultursommerService } from './kultursommer.service';

describe('KultursommerService', () => {
  let service: KultursommerService;
  let httpService: HttpService;

  const now = new Date();
  const dayNum = now.getDate();
  const monthNum = now.getMonth() + 1;
  const sampleDateStr = `So ${dayNum}.${monthNum}.`;

  const mockApiResponse = {
    sub_count: '1',
    month: [
      {
        value: '08',
        display_value: 'August 2026',
        slot: [
          {
            slot_id: 'slot-123',
            festival_day_date: sampleDateStr,
            festival_slot_from: '18:30',
            festival_slot_till: '19:30',
            location_name: 'Reithofferpark',
            zip_code: '15',
            submission_slot: [
              {
                submission_id: 'sub-456',
                genre_category_name: 'Musik',
                ks_kuenstler: 'Wiener Singakademie',
                ks_projekttitel: 'Chor am Park',
                ks_pr_foto_upload_1: 'photo.jpg',
                ks_schlagwort_1: 'Chor',
              },
            ],
          },
        ],
      },
    ],
  };

  const mockHttpService = {
    post: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KultursommerService,
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
      ],
    }).compile();

    service = module.get<KultursommerService>(KultursommerService);
    httpService = module.get<HttpService>(HttpService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should fetch and parse Kultursommer events matching today or tomorrow', async () => {
    mockHttpService.post.mockReturnValueOnce(of({ data: mockApiResponse }));

    const events = await service.fetchEvents();

    expect(events).toBeDefined();
    expect(events.length).toBe(1);

    const first = events[0];
    expect(first.provider).toBe('KULTURSOMMER');
    expect(first.title).toContain('Kultursommer: Wiener Singakademie – Chor am Park');
    expect(first.venueName).toBe('Reithofferpark, 15. Bezirk');
    expect(first.latitude).toBeCloseTo(48.1957, 3);
    expect(first.longitude).toBeCloseTo(16.3282, 3);
    expect(first.category).toBe('Music');
    expect(first.imageUrl).toContain('photo.jpg');
    expect(first.description).toContain('Eintritt frei!');
  });

  it('should handle empty or malformed API response gracefully', async () => {
    mockHttpService.post.mockReturnValueOnce(of({ data: {} }));

    const events = await service.fetchEvents();
    expect(events).toEqual([]);
  });

  it('should handle network errors gracefully without crashing', async () => {
    mockHttpService.post.mockReturnValueOnce(
      throwError(() => new Error('Kultursommer API timeout')),
    );

    const events = await service.fetchEvents();
    expect(events).toEqual([]);
  });
});
