import { HttpModule, HttpService } from '@nestjs/axios';
import { Test, TestingModule } from '@nestjs/testing';
import { of, throwError } from 'rxjs';
import { AxiosResponse } from 'axios';
import { StadtWienService } from './stadt-wien.service';

describe('StadtWienService', () => {
  let service: StadtWienService;
  let httpService: HttpService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [HttpModule],
      providers: [StadtWienService],
    }).compile();

    service = module.get<StadtWienService>(StadtWienService);
    httpService = module.get<HttpService>(HttpService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('fetchEvents', () => {
    it('should parse Open Data Stadt Wien Elasticsearch hits accurately', async () => {
      const todayStr = new Date().toLocaleDateString('sv-SE');

      const mockResponse: AxiosResponse = {
        data: {
          hits: {
            hits: [
              {
                _id: 'sw-doc-1',
                _source: {
                  title: 'Kultursommer Wien am Rathausplatz',
                  short_description: 'Großes Open-Air-Programm für alle Wienerinnen und Wiener.',
                  link: 'https://www.wien.gv.at/veranstaltungen/kultursommer',
                  address: [
                    {
                      addressName: 'Rathausplatz',
                      addressStreet: 'Rathausplatz 1',
                      location: {
                        coordinates: [16.3584, 48.2108], // GeoJSON order: [lng, lat]
                      },
                    },
                  ],
                  teaser_event_image: [
                    { url: 'https://www.wien.gv.at/bilder/kultursommer.jpg' },
                  ],
                  daoh_edit: {
                    logic: {
                      sets: [
                        {
                          type: 'single',
                          dates: [
                            [
                              {
                                from: `${todayStr}T17:00:00+02:00`,
                                to: `${todayStr}T23:00:00+02:00`,
                              },
                            ],
                          ],
                        },
                      ],
                    },
                  },
                },
              },
            ],
          },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      jest.spyOn(httpService, 'post').mockReturnValue(of(mockResponse));

      const events = await service.fetchEvents();

      expect(events).toHaveLength(1);
      const ev = events[0];
      expect(ev.title).toBe('Kultursommer Wien am Rathausplatz');
      expect(ev.provider).toBe('STADT_WIEN');
      expect(ev.venueName).toBe('Rathausplatz');
      // Coordinates correctly mapped to lat / lng
      expect(ev.latitude).toBeCloseTo(48.2108, 4);
      expect(ev.longitude).toBeCloseTo(16.3584, 4);
      expect(ev.imageUrl).toBe('https://www.wien.gv.at/bilder/kultursommer.jpg');
      expect(ev.url).toBe('https://www.wien.gv.at/veranstaltungen/kultursommer');
    });

    it('should gracefully handle Stadt Wien search endpoint errors', async () => {
      jest
        .spyOn(httpService, 'post')
        .mockReturnValue(throwError(() => new Error('Search endpoint unavailable')));

      const events = await service.fetchEvents();
      expect(events).toEqual([]);
    });
  });
});
