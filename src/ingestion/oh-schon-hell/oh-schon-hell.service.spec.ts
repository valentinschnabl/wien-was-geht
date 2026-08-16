import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { AxiosResponse, AxiosHeaders } from 'axios';
import { OhSchonHellService, OhSchonHellApiResponse } from './oh-schon-hell.service';

describe('OhSchonHellService', () => {
  let service: OhSchonHellService;
  let httpService: HttpService;

  const createResponse = <T>(data: T): AxiosResponse<T> => ({
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: { headers: new AxiosHeaders() },
  });

  const todayStr = '2026-08-16';
  const tomorrowStr = '2026-08-17';

  const mockApiResponse: OhSchonHellApiResponse = {
    days: [
      {
        day_name: 'Heute',
        show_date: '16.08.2026',
        events: [
          {
            event_id: 29996,
            name: 'Morgengymnastik mit Techno',
            date: todayStr,
            event_time: '06:00',
            location_name: 'SASS Music Club',
            location_city: 'Vienna',
            event_latitude: '48.20096',
            event_longitude: '16.36922',
            event_post: '/date/sass-vienna-morgengymnastik',
            lineup: '<div class="scWrapper"><iframe src="..."></iframe></div>Tanz in den Sonntag<br>Lineup: DJ A, DJ B',
          },
          {
            event_id: 29997,
            name: 'Hamburg Club Night Outside Vienna',
            date: todayStr,
            event_time: '23:00',
            location_name: 'Golden Pudel',
            location_city: 'Hamburg',
            event_latitude: '53.54635',
            event_longitude: '9.95750',
            event_post: '/date/golden-pudel-hamburg',
          },
        ],
      },
      {
        day_name: 'Morgen',
        show_date: '17.08.2026',
        events: [
          {
            event_id: 29998,
            name: 'Montags Rave',
            date: tomorrowStr,
            event_time: '22:00',
            location_name: 'Grelle Forelle',
            location_city: 'Wien',
            event_latitude: '48.23454',
            event_longitude: '16.36129',
            event_post: '/date/grelle-forelle-montags-rave',
            lineup: 'Industrial Techno All Night',
          },
        ],
      },
      {
        day_name: 'Nächster Freitag',
        show_date: '21.08.2026',
        events: [
          {
            event_id: 29999,
            name: 'Future Event',
            date: '2026-08-21',
            event_time: '23:00',
            location_name: 'Praterstrasse',
          },
        ],
      },
    ],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OhSchonHellService,
        {
          provide: HttpService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<OhSchonHellService>(OhSchonHellService);
    httpService = module.get<HttpService>(HttpService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('fetchEvents', () => {
    it('should fetch, filter for today + tomorrow and normalize Vienna events', async () => {
      jest.spyOn(httpService, 'get').mockReturnValue(of(createResponse(mockApiResponse)));

      const events = await service.fetchEvents(new Date('2026-08-16T12:00:00Z'));

      expect(events).toHaveLength(2);

      // Verify Today's event
      const ev1 = events[0];
      expect(ev1.externalId).toBe('osh-29996');
      expect(ev1.provider).toBe('OH_SCHON_HELL');
      expect(ev1.title).toBe('Morgengymnastik mit Techno');
      expect(ev1.category).toBe('Nightlife');
      expect(ev1.venueName).toBe('SASS Music Club');
      expect(ev1.latitude).toBeCloseTo(48.20096, 4);
      expect(ev1.longitude).toBeCloseTo(16.36922, 4);
      expect(ev1.url).toBe('https://ohschonhell.at/date/sass-vienna-morgengymnastik');
      expect(ev1.imageUrl).toBeNull();
      expect(ev1.description).toContain('Tanz in den Sonntag');
      expect(ev1.description).not.toContain('<iframe');

      // Verify Tomorrow's event
      const ev2 = events[1];
      expect(ev2.externalId).toBe('osh-29998');
      expect(ev2.provider).toBe('OH_SCHON_HELL');
      expect(ev2.title).toBe('Montags Rave');
      expect(ev2.venueName).toBe('Grelle Forelle');
    });

    it('should gracefully handle HTTP errors', async () => {
      jest
        .spyOn(httpService, 'get')
        .mockReturnValue(throwError(() => new Error('Service Unavailable')));

      const events = await service.fetchEvents();
      expect(events).toEqual([]);
    });

    it('should fallback coordinates using known Vienna venues if coordinates are missing', async () => {
      const missingCoordResponse: OhSchonHellApiResponse = {
        days: [
          {
            events: [
              {
                event_id: 30010,
                name: 'Fluc Night',
                date: todayStr,
                event_time: '23:00',
                location_name: 'Fluc Wanne',
                event_latitude: '0',
                event_longitude: '0',
              },
            ],
          },
        ],
      };

      jest.spyOn(httpService, 'get').mockReturnValue(of(createResponse(missingCoordResponse)));

      const events = await service.fetchEvents(new Date('2026-08-16T12:00:00Z'));
      expect(events).toHaveLength(1);
      expect(events[0].latitude).toBeCloseTo(48.2177, 3);
      expect(events[0].longitude).toBeCloseTo(16.3908, 3);
    });
  });
});
