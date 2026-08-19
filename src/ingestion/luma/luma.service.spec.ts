import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { AxiosResponse } from 'axios';
import { LumaService } from './luma.service';

describe('LumaService', () => {
  let service: LumaService;
  let httpService: HttpService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LumaService,
        {
          provide: HttpService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<LumaService>(LumaService);
    httpService = module.get<HttpService>(HttpService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should fetch, parse __NEXT_DATA__, and normalize events successfully', async () => {
    const now = new Date();
    const startAt = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString();
    const endAt = new Date(now.getTime() + 4 * 60 * 60 * 1000).toISOString();

    const mockNextData = {
      props: {
        pageProps: {
          initialData: {
            data: {
              events: [
                {
                  api_id: 'evt-123',
                  event: {
                    api_id: 'evt-123',
                    name: 'Vienna Tech Meetup & Drinks',
                    url: 'tech-meetup-wien',
                    description: 'Come join us for a free tech meetup in Vienna!',
                    start_at: startAt,
                    end_at: endAt,
                    cover_url: 'https://images.lumacdn.com/cover1.jpg',
                    geo_address_info: {
                      address: 'Zoku Vienna',
                      place_coordinate: {
                        latitude: 48.217,
                        longitude: 16.402,
                      },
                    },
                    ticket_info: {
                      is_free: true,
                    },
                  },
                },
              ],
            },
          },
        },
      },
    };

    const mockHtml = `
      <!DOCTYPE html>
      <html>
        <head><title>Beliebte Events in Wien</title></head>
        <body>
          <script id="__NEXT_DATA__" type="application/json">
            ${JSON.stringify(mockNextData)}
          </script>
        </body>
      </html>
    `;

    const mockResponse: AxiosResponse = {
      data: mockHtml,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    };

    jest.spyOn(httpService, 'get').mockReturnValue(of(mockResponse));

    const events = await service.fetchEvents();

    expect(events.length).toBe(1);
    expect(events[0]).toMatchObject({
      externalId: 'luma-evt-123',
      provider: 'LUMA',
      title: 'Vienna Tech Meetup & Drinks',
      venueName: 'Zoku Vienna',
      latitude: 48.217,
      longitude: 16.402,
      url: 'https://lu.ma/tech-meetup-wien',
      imageUrl: null,
      isFree: true,
    });
  });

  it('should handle network errors gracefully and return empty array', async () => {
    jest
      .spyOn(httpService, 'get')
      .mockReturnValue(throwError(() => new Error('Service Unavailable')));

    const events = await service.fetchEvents();
    expect(events).toEqual([]);
  });

  it('should handle missing __NEXT_DATA__ gracefully', async () => {
    const mockResponse: AxiosResponse = {
      data: '<html><body>No data here</body></html>',
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    };

    jest.spyOn(httpService, 'get').mockReturnValue(of(mockResponse));

    const events = await service.fetchEvents();
    expect(events).toEqual([]);
  });
});
