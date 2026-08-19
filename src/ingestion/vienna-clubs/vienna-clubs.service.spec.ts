import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { ViennaClubsService } from './vienna-clubs.service';
import { parseFlexEvents } from './adapters/flex.adapter';
import { parseTheLoftEvents } from './adapters/the-loft.adapter';
import { parseChelseaEvents } from './adapters/chelsea.adapter';
import { parseU4Events } from './adapters/u4.adapter';
import { parseWeberknechtEvents } from './adapters/weberknecht.adapter';
import { parseViperRoomEvents } from './adapters/viper-room.adapter';
import { parseGenericClubEvents } from './adapters/generic-club-feed.adapter';
import { parseJazzClubEvents } from './adapters/jazz.adapter';
import { parseGuertelAndBarEvents } from './adapters/guertel.adapter';
import { parseOpenAirAndStageEvents } from './adapters/openair.adapter';

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

  describe('U4 Adapter (parseU4Events)', () => {
    it('should parse U4 Schema.org JSON-LD events', () => {
      const today = new Date('2026-08-19T00:00:00.000Z');
      const tomorrowEnd = new Date('2026-08-20T23:59:59.999Z');

      const html = `
        <script type="application/ld+json">
          [
            {
              "@type": "Event",
              "name": "RESET",
              "url": "https://www.u4.at/events/reset-u4/",
              "startDate": "2026-08-19T23:00:00+02:00"
            }
          ]
        </script>
      `;

      const events = parseU4Events(html, today, tomorrowEnd);
      expect(events).toHaveLength(1);
      expect(events[0].title).toBe('RESET');
      expect(events[0].venueName).toBe('U4');
      expect(events[0].latitude).toBeCloseTo(48.1848, 3);
      expect(events[0].longitude).toBeCloseTo(16.3292, 3);
      expect(events[0].imageUrl).toBeNull();
    });
  });

  describe('Weberknecht Adapter (parseWeberknechtEvents)', () => {
    it('should parse Weberknecht Schema.org JSON-LD events', () => {
      const today = new Date('2026-08-19T00:00:00.000Z');
      const tomorrowEnd = new Date('2026-08-20T23:59:59.999Z');

      const html = `
        <script type="application/ld+json">
          [
            {
              "@type": "Event",
              "name": "Out of Space Psytrance",
              "url": "https://weberknecht.at/event/psytrance/",
              "startDate": "2026-08-20T22:00:00+02:00"
            }
          ]
        </script>
      `;

      const events = parseWeberknechtEvents(html, today, tomorrowEnd);
      expect(events).toHaveLength(1);
      expect(events[0].title).toBe('Out of Space Psytrance');
      expect(events[0].venueName).toBe('Weberknecht');
      expect(events[0].latitude).toBeCloseTo(48.2117, 3);
      expect(events[0].longitude).toBeCloseTo(16.3403, 3);
    });
  });

  describe('Viper Room Adapter (parseViperRoomEvents)', () => {
    it('should parse Viper Room event items from DOM', () => {
      const now = new Date();
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');

      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      const tomorrowEnd = new Date(now);
      tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);
      tomorrowEnd.setHours(23, 59, 59, 999);

      const html = `
        <ul>
          <li class="event_item">
            <a href="https://www.viper-room.at/events/anette-olzon" class="event_inner">
              <div class="event_datetime">
                <div class="event_date_day">Do.</div>
                <div class="event_date_monthyear">${day}.${month}.</div>
              </div>
              <p class="event_title"><span class="event_name">Live: ANETTE OLZON</span></p>
            </a>
          </li>
        </ul>
      `;

      const events = parseViperRoomEvents(html, todayStart, tomorrowEnd);
      expect(events).toHaveLength(1);
      expect(events[0].title).toBe('Live: ANETTE OLZON');
      expect(events[0].venueName).toBe('Viper Room');
      expect(events[0].category).toBe('Music');
      expect(events[0].latitude).toBeCloseTo(48.1963, 3);
      expect(events[0].longitude).toBeCloseTo(16.3985, 3);
    });
  });

  describe('Generic Club Feed Adapter (parseGenericClubEvents)', () => {
    it('should parse Schema.org JSON-LD @graph events for any Vienna club', () => {
      const today = new Date('2026-08-19T00:00:00.000Z');
      const tomorrowEnd = new Date('2026-08-20T23:59:59.999Z');

      const html = `
        <script type="application/ld+json">
          {
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "Event",
                "name": "Electronic Club Night",
                "url": "https://www.grelleforelle.com/events/night",
                "startDate": "2026-08-19T23:00:00+02:00"
              }
            ]
          }
        </script>
      `;

      const events = parseGenericClubEvents(html, 'Grelle Forelle', 'Nightlife', today, tomorrowEnd);
      expect(events).toHaveLength(1);
      expect(events[0].title).toBe('Electronic Club Night');
      expect(events[0].venueName).toBe('Grelle Forelle');
      expect(events[0].latitude).toBeCloseTo(48.2355, 3);
      expect(events[0].longitude).toBeCloseTo(16.3575, 3);
    });
  });

  describe('Jazz Adapter (parseJazzClubEvents)', () => {
    it('should parse Jazzland and Zwe live sessions from JSON-LD', () => {
      const today = new Date('2026-08-19T00:00:00.000Z');
      const tomorrowEnd = new Date('2026-08-20T23:59:59.999Z');

      const jlJsonLd = `
        <script type="application/ld+json">
          {
            "@type": "Event",
            "name": "Matyas Bartha Quartett",
            "startDate": "2026-08-19T21:00:00+02:00",
            "url": "https://www.jazzland.at/events/matyas"
          }
        </script>
      `;

      const jlEvents = parseJazzClubEvents(jlJsonLd, 'Jazzland', today, tomorrowEnd);
      expect(jlEvents).toHaveLength(1);
      expect(jlEvents[0].venueName).toBe('Jazzland');
      expect(jlEvents[0].category).toBe('Music');

      const emptyEvents = parseJazzClubEvents('', 'Zwe', today, tomorrowEnd);
      expect(emptyEvents).toHaveLength(0);
    });
  });

  describe('Gürtel & Bar Adapter (parseGuertelAndBarEvents)', () => {
    it('should parse Fledermaus and Carina events from JSON-LD', () => {
      const today = new Date('2026-08-19T00:00:00.000Z');
      const tomorrowEnd = new Date('2026-08-20T23:59:59.999Z');

      const fledermausJsonLd = `
        <script type="application/ld+json">
          [
            {
              "@type": "Event",
              "name": "Holiday Club",
              "startDate": "2026-08-19T21:00:00+02:00"
            }
          ]
        </script>
      `;

      const fledermausEvents = parseGuertelAndBarEvents(fledermausJsonLd, 'Fledermaus', today, tomorrowEnd);
      expect(fledermausEvents).toHaveLength(1);
      expect(fledermausEvents[0].venueName).toBe('Fledermaus');

      const emptyEvents = parseGuertelAndBarEvents('', 'Jenseits', today, tomorrowEnd);
      expect(emptyEvents).toHaveLength(0);
    });
  });

  describe('Open Air & Stage Adapter (parseOpenAirAndStageEvents)', () => {
    it('should parse MQ and Arena events from JSON-LD', () => {
      const today = new Date('2026-08-19T00:00:00.000Z');
      const tomorrowEnd = new Date('2026-08-20T23:59:59.999Z');

      const mqJsonLd = `
        <script type="application/ld+json">
          {
            "@type": "Event",
            "name": "BAIBA Live",
            "startDate": "2026-08-19T19:30:00+02:00"
          }
        </script>
      `;

      const mqEvents = parseOpenAirAndStageEvents(mqJsonLd, 'MQ', today, tomorrowEnd);
      expect(mqEvents).toHaveLength(1);
      expect(mqEvents[0].title).toContain('BAIBA');
      expect(mqEvents[0].venueName).toBe('MQ');

      const emptyEvents = parseOpenAirAndStageEvents('', 'Arena', today, tomorrowEnd);
      expect(emptyEvents).toHaveLength(0);
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

      const u4Html = `
        <script type="application/ld+json">
          [{ "@type": "Event", "name": "U4 Clubnight", "startDate": "${new Date().toISOString()}" }]
        </script>
      `;

      jest.spyOn(httpService, 'get').mockImplementation((url: string) => {
        if (url.includes('flex.at')) {
          return of(mockAxiosResponse(flexHtml));
        }
        if (url.includes('theloft.at')) {
          return of(mockAxiosResponse(loftPosts));
        }
        if (url.includes('u4.at')) {
          return of(mockAxiosResponse(u4Html));
        }
        if (url.includes('chelsea.co.at')) {
          return throwError(() => new Error('Chelsea Timeout 504'));
        }
        return of(mockAxiosResponse(''));
      });

      const results = await service.fetchEvents();
      expect(results.length).toBeGreaterThanOrEqual(3);
      expect(results.some((e) => e.venueName === 'Flex')).toBe(true);
      expect(results.some((e) => e.venueName === 'The Loft')).toBe(true);
      expect(results.some((e) => e.venueName === 'U4')).toBe(true);
    });
  });
});
