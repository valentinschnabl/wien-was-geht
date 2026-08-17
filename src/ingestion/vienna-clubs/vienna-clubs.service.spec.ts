import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { ViennaClubsService } from './vienna-clubs.service';
import { parseFlexEvents } from './adapters/flex.adapter';
import { parseTheLoftEvents } from './adapters/the-loft.adapter';
import { parseChelseaEvents } from './adapters/chelsea.adapter';

describe('ViennaClubsService & Adapters', () => {
  let service: ViennaClubsService;
  let httpService: HttpService;

  const mockAxiosResponse = <T>(data: T): AxiosResponse<T> => ({
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: { headers: {} } as InternalAxiosRequestConfig,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ViennaClubsService,
        {
          provide: HttpService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ViennaClubsService>(ViennaClubsService);
    httpService = module.get<HttpService>(HttpService);
  });

  describe('Flex Adapter (parseFlexEvents)', () => {
    it('should parse Schema.org JSON-LD events correctly', () => {
      const today = new Date('2026-08-17T00:00:00.000Z');
      const tomorrowEnd = new Date('2026-08-18T23:59:59.999Z');

      const html = `
        <html>
          <head>
            <script type="application/ld+json">
              [
                {
                  "@type": "Event",
                  "name": "BEAT IT",
                  "description": "<p>Drum'n'Bass €10,- Eintritt</p>",
                  "image": "https://flex.at/beatit.jpg",
                  "url": "https://flex.at/event/beat-it-4/",
                  "startDate": "2026-08-17T23:00:00+02:00",
                  "endDate": "2026-08-18T05:00:00+02:00"
                },
                {
                  "@type": "Event",
                  "name": "Future Concert",
                  "startDate": "2026-10-01T20:00:00+02:00"
                }
              ]
            </script>
          </head>
          <body>Flex</body>
        </html>
      `;

      const events = parseFlexEvents(html, today, tomorrowEnd);
      expect(events).toHaveLength(1);
      expect(events[0].title).toBe('BEAT IT');
      expect(events[0].venueName).toBe('Flex');
      expect(events[0].latitude).toBeCloseTo(48.2185, 3);
      expect(events[0].longitude).toBeCloseTo(16.3705, 3);
      expect(events[0].provider).toBe('VIENNA_CLUBS');
      expect(events[0].imageUrl).toBe('https://flex.at/beatit.jpg');
    });

    it('should handle missing or invalid JSON-LD gracefully', () => {
      const today = new Date();
      const tomorrowEnd = new Date(Date.now() + 86400000);
      expect(parseFlexEvents('<html>No scripts</html>', today, tomorrowEnd)).toEqual([]);
      expect(parseFlexEvents('<script type="application/ld+json">{ broken json</script>', today, tomorrowEnd)).toEqual([]);
    });
  });

  describe('The Loft Adapter (parseTheLoftEvents)', () => {
    it('should parse WordPress REST API posts correctly', () => {
      const today = new Date('2026-08-17T00:00:00.000Z');
      const tomorrowEnd = new Date('2026-08-18T23:59:59.999Z');

      const mockPosts = [
        {
          id: 101,
          date: '2026-08-17T22:00:00',
          link: 'https://www.theloft.at/kra-shout/',
          title: { rendered: 'KRA$HOUT Clubnight' },
          excerpt: { rendered: '<p>Hip Hop & Trap all night</p>' },
          _embedded: {
            'wp:featuredmedia': [{ source_url: 'https://www.theloft.at/image.jpg' }],
          },
        },
        {
          id: 102,
          date: '2026-08-25T20:00:00',
          title: { rendered: 'Next Week Party' },
        },
      ];

      const events = parseTheLoftEvents(mockPosts, today, tomorrowEnd);
      expect(events).toHaveLength(1);
      expect(events[0].title).toBe('KRA$HOUT Clubnight');
      expect(events[0].venueName).toBe('The Loft');
      expect(events[0].latitude).toBeCloseTo(48.2133, 3);
      expect(events[0].category).toBe('Nightlife');
    });
  });

  describe('Chelsea Adapter (parseChelseaEvents)', () => {
    it('should parse Tonight Live show from Chelsea homepage', () => {
      const today = new Date('2026-08-17T00:00:00.000Z');
      const tomorrowEnd = new Date('2026-08-18T23:59:59.999Z');

      const html = `
        <html>
          <body>
            Tonight Live: MYSIE / CHOVO
            CHELSEA MUSICPLACE Lerchenfelder Gürtel U-Bahnbögen 29-30 1080 Vienna
          </body>
        </html>
      `;

      const events = parseChelseaEvents(html, today, tomorrowEnd);
      expect(events).toHaveLength(1);
      expect(events[0].title).toBe('Live: MYSIE / CHOVO');
      expect(events[0].venueName).toBe('Chelsea');
      expect(events[0].category).toBe('Music');
      expect(events[0].latitude).toBeCloseTo(48.2155, 3);
    });
  });

  describe('ViennaClubsService Integration', () => {
    it('should aggregate events across all clubs with error isolation', async () => {
      const flexHtml = `
        <script type="application/ld+json">
          [{ "@type": "Event", "name": "Flex DnB Night", "startDate": "${new Date().toISOString()}" }]
        </script>
      `;

      const loftPosts = [
        {
          id: 55,
          date: new Date().toISOString(),
          title: { rendered: 'Loft Party' },
        },
      ];

      // Flex succeeds, Loft succeeds, Chelsea fails
      jest.spyOn(httpService, 'get').mockImplementation((url: string) => {
        if (url.includes('flex.at')) {
          return of(mockAxiosResponse(flexHtml));
        }
        if (url.includes('theloft.at')) {
          return of(mockAxiosResponse(loftPosts));
        }
        if (url.includes('chelsea.co.at')) {
          return throwError(() => new Error('Chelsea Timeout 504'));
        }
        return of(mockAxiosResponse(''));
      });

      const results = await service.fetchEvents();
      expect(results.length).toBeGreaterThanOrEqual(2);
      expect(results.some((e) => e.venueName === 'Flex')).toBe(true);
      expect(results.some((e) => e.venueName === 'The Loft')).toBe(true);
    });
  });
});
