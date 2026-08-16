import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { CapeetService } from './capeet.service';

describe('CapeetService', () => {
  let service: CapeetService;
  let httpService: HttpService;

  const mockCapeetHtml = `
<html>
<body>
<b><u>KW 33:</u></b><br>
15.08.: <b><a href="https://nationoflanguage.bandcamp.com/">NATION OF LANGUAGE</a> (usa)</b> @ <i>Flex, Wien</i> <a href="https://cuteconcerts.com/concerts/nation-of-language">[web]</a><br>
16.08.: <b><a href="https://mutilatedjudge.bandcamp.com/">MUTILATED JUDGE</a> (spa) / ASSBALLS</b> @ <i>Arena-Beisl, Wien</i><br>
16.08.: <b><a href="https://www.deftones.com/">DEFTONES</a> (usa)</b> @ <i>METAStadt (Open Air), Wien</i> <a href="https://facebook.com/event/123">[fb]</a><br>
16.08.: <b><a href="https://ignite.com/">IGNITE</a> (usa)</b> @ <i>Music-House, Graz</i><br>
16.08.: <font color="red">16.08.: <b>CANCELLED BAND</b> @ <i>WUK, Wien</i> [cancelled.]</font><br>
17.08.: <b>FUTURE BAND</b> @ <i>Chelsea, Wien</i><br>
</body>
</html>
`;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CapeetService,
        {
          provide: HttpService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CapeetService>(CapeetService);
    httpService = module.get<HttpService>(HttpService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should correctly parse and extract only Vienna concerts for the target date', async () => {
    const targetDate = new Date('2026-08-16T12:00:00.000Z');

    jest.spyOn(httpService, 'get').mockReturnValue(
      of({
        data: mockCapeetHtml,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      }),
    );

    const events = await service.fetchEvents(targetDate);

    // Should include Arena-Beisl (16.08), METAStadt (16.08), and Chelsea (17.08), but NOT Graz (16.08), NOT cancelled, NOT past 15.08
    expect(events.length).toBe(3);

    const arenaGig = events.find((e) => e.title.includes('MUTILATED JUDGE'));
    expect(arenaGig).toBeDefined();
    expect(arenaGig?.provider).toBe('CAPEET');
    expect(arenaGig?.category).toBe('Music');
    expect(arenaGig?.venueName).toBe('Arena-Beisl, Wien');
    // Resolved coords for Arena
    expect(arenaGig?.latitude).toBeCloseTo(48.1883, 3);
    expect(arenaGig?.longitude).toBeCloseTo(16.4136, 3);

    const metastadtGig = events.find((e) => e.title.includes('DEFTONES'));
    expect(metastadtGig).toBeDefined();
    expect(metastadtGig?.url).toBe('https://facebook.com/event/123');
    expect(metastadtGig?.latitude).toBeCloseTo(48.2172, 3);
    expect(metastadtGig?.longitude).toBeCloseTo(16.4678, 3);

    const chelseaGig = events.find((e) => e.title.includes('FUTURE BAND'));
    expect(chelseaGig).toBeDefined();
    expect(chelseaGig?.venueName).toBe('Chelsea, Wien');
    expect(chelseaGig?.latitude).toBeCloseTo(48.2155, 3);
  });

  it('should gracefully handle HTTP errors and return empty list', async () => {
    jest.spyOn(httpService, 'get').mockReturnValue(
      throwError(() => new Error('Network timeout')),
    );

    const events = await service.fetchEvents(new Date('2026-08-16T12:00:00.000Z'));
    expect(events).toEqual([]);
  });
});
