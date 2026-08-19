import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { AxiosResponse } from 'axios';
import { RausgegangenService } from './rausgegangen.service';

describe('RausgegangenService', () => {
  let service: RausgegangenService;
  let httpService: HttpService;

  const mockListingHtml = `
    <html>
      <body>
        <a class="event-tile" href="/at/events/kaws-art-comix-91/">
          <span>KAWS ART & COMIX</span>
        </a>
        <a class="event-tile" href="/at/events/firefly-dj-workshop-3/">
          <span>FireFly DJ Workshop</span>
        </a>
      </body>
    </html>
  `;

  const mockDetailHtml1 = `
    <html>
      <head>
        <script type="application/ld+json">
          {
            "@context": "https://schema.org",
            "@type": "Event",
            "name": "KAWS ART & COMIX",
            "description": "Exhibition at Albertina Modern",
            "startDate": "2026-08-19T10:00+02:00",
            "endDate": "2026-08-19T18:00+02:00",
            "location": {
              "@type": "Place",
              "name": "Albertina Modern"
            },
            "offers": {
              "@type": "Offer",
              "price": 15,
              "url": "https://albertina.at/tickets"
            }
          }
        </script>
      </head>
      <body></body>
    </html>
  `;

  const mockDetailHtml2 = `
    <html>
      <head>
        <script type="application/ld+json">
          {
            "@context": "https://schema.org",
            "@type": "Event",
            "name": "FireFly DJ Workshop",
            "description": "Inclusive DJ Workshop at Flucc",
            "startDate": "2026-08-19T18:00+02:00",
            "endDate": "2026-08-20T06:00+02:00",
            "location": {
              "@type": "Place",
              "name": "Flucc"
            },
            "offers": {
              "@type": "Offer",
              "price": 0,
              "url": "https://www.flucc.at"
            }
          }
        </script>
      </head>
      <body></body>
    </html>
  `;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RausgegangenService,
        {
          provide: HttpService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<RausgegangenService>(RausgegangenService);
    httpService = module.get<HttpService>(HttpService);

    // Mock sleep to be instantaneous in tests
    jest.spyOn(service as any, 'sleep').mockResolvedValue(undefined);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should extract and normalize Schema.org event JSON-LD correctly', async () => {
    jest.spyOn(httpService, 'get').mockImplementation((url: string) => {
      if (url.includes('tipps-fuer-heute')) {
        return of({ data: mockListingHtml } as AxiosResponse<string>);
      }
      if (url.includes('tipps-fuer-morgen')) {
        return of({ data: mockListingHtml } as AxiosResponse<string>);
      }
      if (url.includes('kaws-art-comix-91')) {
        return of({ data: mockDetailHtml1 } as AxiosResponse<string>);
      }
      if (url.includes('firefly-dj-workshop-3')) {
        return of({ data: mockDetailHtml2 } as AxiosResponse<string>);
      }
      return of({ data: '' } as AxiosResponse<string>);
    });

    const events = await service.fetchEvents();

    expect(events.length).toBe(2);

    const kaws = events.find((e) => e.title === 'KAWS ART & COMIX');
    expect(kaws).toBeDefined();
    expect(kaws?.provider).toBe('RAUSGEGANGEN');
    expect(kaws?.externalId).toBe('rausgegangen-kaws-art-comix-91');
    expect(kaws?.venueName).toBe('Albertina Modern');
    expect(kaws?.url).toBe('https://albertina.at/tickets');
    expect(kaws?.imageUrl).toBeNull(); // Option 2 verified
    expect(kaws?.isFree).toBe(false);

    const firefly = events.find((e) => e.title === 'FireFly DJ Workshop');
    expect(firefly).toBeDefined();
    expect(firefly?.venueName).toBe('Flucc');
    expect(firefly?.isFree).toBe(true);
    expect(firefly?.imageUrl).toBeNull();
  });

  it('should gracefully handle network failures and return empty list', async () => {
    jest.spyOn(httpService, 'get').mockReturnValue(throwError(() => new Error('Connection refused')));

    const events = await service.fetchEvents();
    expect(events).toEqual([]);
  });
});
