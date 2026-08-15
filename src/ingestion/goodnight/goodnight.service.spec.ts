import { HttpModule, HttpService } from '@nestjs/axios';
import { Test, TestingModule } from '@nestjs/testing';
import { of, throwError } from 'rxjs';
import { AxiosResponse } from 'axios';
import { GoodnightService } from './goodnight.service';

describe('GoodnightService', () => {
  let service: GoodnightService;
  let httpService: HttpService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [HttpModule],
      providers: [GoodnightService],
    }).compile();

    service = module.get<GoodnightService>(GoodnightService);
    httpService = module.get<HttpService>(HttpService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('fetchEvents', () => {
    it('should parse grouped events from Goodnight API and apply zero-image policy', async () => {
      const todayStr = new Date().toLocaleDateString('sv-SE');

      const mockResponse: AxiosResponse = {
        data: {
          data: [
            {
              date: todayStr,
              formatted_date: 'Heute',
              events: [
                {
                  id: 'gn-99',
                  title: 'Pratersauna Pool & Techno',
                  teaser_text: 'Open Air am Pool mit feinsten Beats',
                  slug: 'pratersauna-pool-techno',
                  event_date: {
                    start: `${todayStr} 14:00:00`,
                    end: `${todayStr} 22:00:00`,
                  },
                  time_start: '14:00',
                  time_end: '22:00',
                  event_link: 'https://goodnight.at/events/pratersauna-pool-techno',
                  location: {
                    title: 'Pratersauna',
                    address: {
                      city: 'Wien',
                      street: 'Waldsteingartenstraße 135',
                      zip_code: '1020',
                    },
                  },
                  category: {
                    id: '1',
                    title: 'Party',
                    slug: 'party',
                  },
                },
              ],
            },
          ],
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      jest.spyOn(httpService, 'get').mockReturnValue(of(mockResponse));

      const events = await service.fetchEvents();

      expect(events).toHaveLength(1);
      const ev = events[0];
      expect(ev.title).toBe('Pratersauna Pool & Techno');
      expect(ev.provider).toBe('GOODNIGHT');
      expect(ev.category).toBe('Party');
      expect(ev.venueName).toBe('Pratersauna');
      expect(ev.url).toBe('https://goodnight.at/events/pratersauna-pool-techno');
      expect(ev.imageUrl).toBeNull(); // zero image storage policy
      expect(ev.latitude).toBeCloseTo(48.2132, 4);
      expect(ev.longitude).toBeCloseTo(16.4024, 4);
    });

    it('should gracefully handle empty or errored Goodnight response', async () => {
      jest
        .spyOn(httpService, 'get')
        .mockReturnValue(throwError(() => new Error('Goodnight API offline')));

      const events = await service.fetchEvents();
      expect(events).toEqual([]);
    });
  });
});
