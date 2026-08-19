import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { AxiosResponse } from 'axios';
import { PartytimerService } from './partytimer.service';

describe('PartytimerService', () => {
  let service: PartytimerService;
  let httpService: HttpService;

  const now = new Date();
  const day = now.getDate();
  const month = now.getMonth() + 1;

  const mockHtml = `
    <html>
      <body>
        <a href="/events/1526219">
          Event Party Bounti Mi ${day}.${month}., 23:00 Uhr U4, 1120 Wien
        </a>
        <a href="/events/1700211">
          Event Party Disco Tropical Mi ${day}.${month}., 21:00 Uhr Cabaret Fledermaus, 1010 Wien
        </a>
        <a href="/events/1414235">
          Event Jazz / Improvisation Let's Groove Jazz Jam Session Mi ${day}.${month}., 20:00 Uhr Zwe, 1020 Wien
        </a>
      </body>
    </html>
  `;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PartytimerService,
        {
          provide: HttpService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PartytimerService>(PartytimerService);
    httpService = module.get<HttpService>(HttpService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should extract and normalize Partytimer events correctly', async () => {
    jest.spyOn(httpService, 'get').mockReturnValue(of({ data: mockHtml } as AxiosResponse<string>));

    const events = await service.fetchEvents();

    expect(events.length).toBe(3);

    const u4 = events.find((e) => e.venueName === 'U4');
    expect(u4).toBeDefined();
    expect(u4?.provider).toBe('PARTYTIMER');
    expect(u4?.externalId).toBe('partytimer-1526219');
    expect(u4?.title).toBe('Bounti');
    expect(u4?.latitude).toBeCloseTo(48.1848, 3);
    expect(u4?.longitude).toBeCloseTo(16.3292, 3);
    expect(u4?.imageUrl).toBeNull();

    const fledermaus = events.find((e) => e.venueName === 'Cabaret Fledermaus');
    expect(fledermaus).toBeDefined();
    expect(fledermaus?.title).toBe('Disco Tropical');
    expect(fledermaus?.latitude).toBeCloseTo(48.2075, 3);

    const zwe = events.find((e) => e.venueName === 'Zwe');
    expect(zwe).toBeDefined();
    expect(zwe?.category).toBe('Music');
  });

  it('should gracefully handle network failure and return empty list', async () => {
    jest.spyOn(httpService, 'get').mockReturnValue(throwError(() => new Error('Connection timeout')));

    const events = await service.fetchEvents();
    expect(events).toEqual([]);
  });
});
