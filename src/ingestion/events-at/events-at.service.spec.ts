import { HttpModule, HttpService } from '@nestjs/axios';
import { Test, TestingModule } from '@nestjs/testing';
import { of, throwError } from 'rxjs';
import { AxiosResponse } from 'axios';
import { EventsAtService } from './events-at.service';

describe('EventsAtService', () => {
  let service: EventsAtService;
  let httpService: HttpService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [HttpModule],
      providers: [EventsAtService],
    }).compile();

    service = module.get<EventsAtService>(EventsAtService);
    httpService = module.get<HttpService>(HttpService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('fetchEvents', () => {
    it('should parse Schema.org JSON-LD events occurring today and filter out other dates', async () => {
      const todayStr = new Date().toLocaleDateString('sv-SE');
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toLocaleDateString('sv-SE');

      const mockCalendarHtml = `
        <!DOCTYPE html>
        <html>
        <body>
          <a href="/event/festwochen-premiere">Festwochen Premiere</a>
          <a href="/event/morgen-konzert">Morgen Konzert</a>
        </body>
        </html>
      `;

      const mockDetailHtml1 = `
        <!DOCTYPE html>
        <html>
        <head>
          <script type="application/ld+json">
          {
            "@context": "https://schema.org",
            "@type": "Event",
            "name": "Wiener Festwochen Premiere",
            "description": "Großes Theaterstück im Museumsquartier",
            "url": "https://events.at/event/festwochen-premiere",
            "startDate": "${todayStr}T19:30:00+02:00",
            "endDate": "${todayStr}T22:00:00+02:00",
            "location": {
              "@type": "Place",
              "name": "MuseumsQuartier Halle E",
              "address": {
                "@type": "PostalAddress",
                "streetAddress": "Museumsplatz 1",
                "addressLocality": "Wien",
                "postalCode": "1070"
              },
              "geo": {
                "@type": "GeoCoordinates",
                "latitude": "48.2033",
                "longitude": "16.3586"
              }
            }
          }
          </script>
        </head>
        </html>
      `;

      const mockDetailHtml2 = `
        <!DOCTYPE html>
        <html>
        <head>
          <script type="application/ld+json">
          {
            "@context": "https://schema.org",
            "@type": "Event",
            "name": "Morgen Konzert",
            "description": "Konzert erst morgen",
            "url": "https://events.at/event/morgen-konzert",
            "startDate": "${tomorrowStr}T20:00:00+02:00",
            "endDate": "${tomorrowStr}T23:00:00+02:00",
            "location": {
              "@type": "Place",
              "name": "Konzerthaus",
              "address": {
                "addressLocality": "Wien"
              },
              "geo": {
                "@type": "GeoCoordinates",
                "latitude": 48.2007,
                "longitude": 16.3769
              }
            }
          }
          </script>
        </head>
        </html>
      `;

      const createResponse = (html: string): AxiosResponse => ({
        data: html,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

      jest.spyOn(httpService, 'get').mockImplementation((url: string) => {
        if (url.includes('/calendar/')) {
          return of(createResponse(mockCalendarHtml));
        } else if (url.includes('festwochen-premiere')) {
          return of(createResponse(mockDetailHtml1));
        } else if (url.includes('morgen-konzert')) {
          return of(createResponse(mockDetailHtml2));
        }
        return of(createResponse('<html></html>'));
      });

      const events = await service.fetchEvents();

      // Today's and Tomorrow's events should be included
      expect(events).toHaveLength(2);
      const ev = events[0];
      expect(ev.title).toBe('Wiener Festwochen Premiere');
      expect(ev.provider).toBe('EVENTS_AT');
      expect(ev.venueName).toBe('MuseumsQuartier Halle E');
      expect(ev.latitude).toBeCloseTo(48.2033, 4);
      expect(ev.longitude).toBeCloseTo(16.3586, 4);
      expect(ev.url).toBe('https://events.at/event/festwochen-premiere');
      // Verify zero image storage policy
      expect(ev.imageUrl).toBeNull();

      const ev2 = events[1];
      expect(ev2.title).toBe('Morgen Konzert');
      expect(ev2.provider).toBe('EVENTS_AT');
    });

    it('should filter out events outside Vienna 35km boundary', async () => {
      const todayStr = new Date().toLocaleDateString('sv-SE');

      const mockCalendarHtml = `<a href="/event/graz-konzert">Graz Konzert</a>`;
      const mockDetailHtml = `
        <html>
        <head>
          <script type="application/ld+json">
          {
            "@context": "https://schema.org",
            "@type": "Event",
            "name": "Konzert in Graz",
            "url": "https://events.at/event/graz-konzert",
            "startDate": "${todayStr}T20:00:00+02:00",
            "endDate": "${todayStr}T23:00:00+02:00",
            "location": {
              "@type": "Place",
              "name": "Stadthalle Graz",
              "address": {
                "addressLocality": "Graz"
              },
              "geo": {
                "@type": "GeoCoordinates",
                "latitude": 47.0707,
                "longitude": 15.4395
              }
            }
          }
          </script>
        </head>
        </html>
      `;

      const createResponse = (html: string): AxiosResponse => ({
        data: html,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

      jest.spyOn(httpService, 'get').mockImplementation((url: string) => {
        if (url.includes('/calendar/')) {
          return of(createResponse(mockCalendarHtml));
        } else {
          return of(createResponse(mockDetailHtml));
        }
      });

      const events = await service.fetchEvents();
      expect(events).toHaveLength(0);
    });

    it('should gracefully handle network failure without throwing', async () => {
      jest
        .spyOn(httpService, 'get')
        .mockReturnValue(throwError(() => new Error('Connection timeout')));

      const events = await service.fetchEvents();
      expect(events).toEqual([]);
    });
  });
});
