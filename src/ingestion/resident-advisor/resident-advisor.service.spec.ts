import { HttpModule, HttpService } from '@nestjs/axios';
import { Test, TestingModule } from '@nestjs/testing';
import { of, throwError } from 'rxjs';
import { AxiosResponse } from 'axios';
import { ResidentAdvisorService } from './resident-advisor.service';

describe('ResidentAdvisorService', () => {
  let service: ResidentAdvisorService;
  let httpService: HttpService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [HttpModule],
      providers: [ResidentAdvisorService],
    }).compile();

    service = module.get<ResidentAdvisorService>(ResidentAdvisorService);
    httpService = module.get<HttpService>(HttpService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('fetchEvents', () => {
    it('should query GraphQL endpoint and extract events with flyer images and geocoded venues', async () => {
      const todayStr = new Date().toLocaleDateString('sv-SE');

      const mockGqlResponse: AxiosResponse = {
        data: {
          data: {
            eventListings: {
              data: [
                {
                  id: 'ra-event-101',
                  listingDate: `${todayStr}T23:00:00.000Z`,
                  event: {
                    id: '101',
                    title: 'SYNERGY x HARD TECHNO RAVE',
                    startTime: `${todayStr}T23:00:00.000Z`,
                    endTime: `${todayStr}T06:00:00.000Z`,
                    contentUrl: '/events/101',
                    venue: {
                      id: 'v-werk',
                      name: 'Das Werk',
                      address: 'Spittelauer Lände 12, 1090 Wien',
                      latitude: 48.2346,
                      longitude: 16.3582,
                    },
                    images: [
                      {
                        filename: 'flyer-synergy-2026.jpg',
                        type: 'FLYERFRONT',
                      },
                    ],
                  },
                },
                {
                  id: 'ra-event-102',
                  listingDate: `${todayStr}T22:00:00.000Z`,
                  event: {
                    id: '102',
                    title: 'SASS Klubnacht',
                    startTime: `${todayStr}T22:00:00.000Z`,
                    endTime: `${todayStr}T06:00:00.000Z`,
                    contentUrl: '/events/102',
                    venue: {
                      id: 'v-sass',
                      name: 'SASS Music Club',
                      address: 'Karlsplatz 1, 1010 Wien',
                      // Venue without coords -> should resolve via known club map
                      latitude: null,
                      longitude: null,
                    },
                    images: [],
                  },
                },
              ],
            },
          },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      jest.spyOn(httpService, 'post').mockReturnValue(of(mockGqlResponse));

      const events = await service.fetchEvents();

      expect(events).toHaveLength(2);

      // Event 1: with flyer front image URL
      const ev1 = events[0];
      expect(ev1.title).toBe('SYNERGY x HARD TECHNO RAVE');
      expect(ev1.provider).toBe('RESIDENT_ADVISOR');
      expect(ev1.category).toBe('Nightlife');
      expect(ev1.venueName).toBe('Das Werk');
      expect(ev1.imageUrl).toBe('https://images.ra.co/images/events/flyer/flyer-synergy-2026.jpg');
      expect(ev1.url).toBe('https://ra.co/events/101');
      expect(ev1.latitude).toBeCloseTo(48.2346, 4);

      // Event 2: SASS Club geocoded fallback
      const ev2 = events[1];
      expect(ev2.title).toBe('SASS Klubnacht');
      expect(ev2.venueName).toBe('SASS Music Club');
      expect(ev2.latitude).toBeCloseTo(48.2011, 3);
      expect(ev2.longitude).toBeCloseTo(16.3688, 3);
      expect(ev2.imageUrl).toBeNull();
    });

    it('should gracefully handle GraphQL errors without throwing', async () => {
      jest
        .spyOn(httpService, 'post')
        .mockReturnValue(throwError(() => new Error('RA GraphQL 503 Service Unavailable')));

      const events = await service.fetchEvents();
      expect(events).toEqual([]);
    });
  });
});
