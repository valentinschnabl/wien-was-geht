import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { AxiosResponse } from 'axios';
import { WardaService } from './warda.service';

describe('WardaService', () => {
  let service: WardaService;
  let httpService: HttpService;

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const todayCompact = `${year}${month}${day}`;

  const mockListingHtml = `
    <html>
      <body>
        <a href="https://warda.at/events/rave-am-mittwoch-8/">RAVE AM MITTWOCH</a>
        <a href="https://warda.at/events/crazy-7/">CRAZY</a>
        <a href="https://warda.at/events_cat/party/">Category</a>
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
            "name": "RAVE AM MITTWOCH",
            "description": "RECHARGE WEDNESDAYS im Werk. Freie Spende erbeten.",
            "startDate": "${todayCompact}T23:00",
            "endDate": "${todayCompact}T04:00",
            "location": {
              "@type": "Place",
              "name": "Das Werk",
              "address": {
                "@type": "PostalAddress",
                "streetAddress": "Spittelauer Lände 331, 1090 Wien"
              }
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
            "name": "CRAZY &#8211; Open Air",
            "description": "Summer Party by the beach",
            "startDate": "${todayCompact}T18:00",
            "endDate": "${todayCompact}T23:00",
            "location": {
              "@type": "Place",
              "name": "Vienna City Beach Club"
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
        WardaService,
        {
          provide: HttpService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<WardaService>(WardaService);
    httpService = module.get<HttpService>(HttpService);

    // Instant sleep for tests
    jest.spyOn(service as any, 'sleep').mockResolvedValue(undefined);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should parse WARDA listing and detail JSON-LD correctly', async () => {
    jest.spyOn(httpService, 'get').mockImplementation((url: string) => {
      if (url === 'https://warda.at/events/' || url.endsWith('/events/')) {
        return of({ data: mockListingHtml } as AxiosResponse<string>);
      }
      if (url.includes('rave-am-mittwoch-8')) {
        return of({ data: mockDetailHtml1 } as AxiosResponse<string>);
      }
      if (url.includes('crazy-7')) {
        return of({ data: mockDetailHtml2 } as AxiosResponse<string>);
      }
      return of({ data: '' } as AxiosResponse<string>);
    });

    const events = await service.fetchEvents();

    expect(events.length).toBe(2);

    const rave = events.find((e) => e.title === 'RAVE AM MITTWOCH');
    expect(rave).toBeDefined();
    expect(rave?.provider).toBe('WARDA');
    expect(rave?.externalId).toBe('warda-rave-am-mittwoch-8');
    expect(rave?.venueName).toBe('Das Werk');
    expect(rave?.imageUrl).toBeNull(); // Option 2 verified
    expect(rave?.isFree).toBe(true); // Freie Spende detected

    const crazy = events.find((e) => e.title.includes('CRAZY'));
    expect(crazy).toBeDefined();
    expect(crazy?.title).toBe('CRAZY – Open Air');
    expect(crazy?.venueName).toBe('Vienna City Beach Club');
    expect(crazy?.imageUrl).toBeNull();
  });

  it('should gracefully handle network failures and return empty list', async () => {
    jest.spyOn(httpService, 'get').mockReturnValue(throwError(() => new Error('Connection refused')));

    const events = await service.fetchEvents();
    expect(events).toEqual([]);
  });
});
