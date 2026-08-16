import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { EintrittFreiService } from './eintritt-frei.service';

describe('EintrittFreiService', () => {
  let service: EintrittFreiService;
  let httpService: HttpService;

  const sampleHtml = `
    <!DOCTYPE html>
    <html>
      <body>
        <h2>Sonntag, 16. August</h2>
        <h4>Texasschrammeln XXXL auf der Bühne im Donaupark</h4>
        <p>Wiener Schrammelmusik trifft auf Jazz und Folk.</p>
        <ul>
          <li>Datum: Sonntag, 16. August</li>
          <li>Uhrzeit: 19.30 bis 22.00</li>
          <li>Ort: Donaupark, 1220 Wien</li>
        </ul>
        <p><a href="https://www.buehnedonaupark.at/">Mehr über das Programm erkunden</a></p>

        <h4>VOLXkino: „Die guten und die besseren Tage“ im Otto Wagner Areal</h4>
        <p>Freiluftkino im Pavillon 12.</p>
        <ul>
          <li>Uhrzeit: 20.00</li>
          <li>Ort: Otto Wagner Areal, 1140 Wien</li>
        </ul>

        <h2>Montag, 17. August</h2>
        <h4>Filmfestival am Rathausplatz: „Orphea In Love“</h4>
        <p>Opernverfilmung unter freiem Himmel.</p>
        <ul>
          <li>Uhrzeit: 20.45 bis 22.30</li>
          <li>Ort: Rathausplatz, 1010 Wien</li>
        </ul>
        <p><a href="https://filmfestival-rathausplatz.at/">Programm erkunden</a></p>
      </body>
    </html>
  `;

  const mockHttpService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EintrittFreiService,
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
      ],
    }).compile();

    service = module.get<EintrittFreiService>(EintrittFreiService);
    httpService = module.get<HttpService>(HttpService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should scrape and parse free cultural events for today and tomorrow', async () => {
    mockHttpService.get.mockReturnValueOnce(of({ data: sampleHtml }));

    const events = await service.fetchEvents();

    expect(events).toBeDefined();
    expect(Array.isArray(events)).toBe(true);

    if (events.length > 0) {
      const first = events[0];
      expect(first.provider).toBe('EINTRITT_FREI');
      expect(first.title).toBeDefined();
      expect(first.latitude).toBeGreaterThan(48.0);
      expect(first.longitude).toBeGreaterThan(16.0);
      expect(first.description).toContain('Eintritt frei');
    }
  });

  it('should handle empty or malformed HTML response gracefully', async () => {
    mockHttpService.get.mockReturnValueOnce(of({ data: '' }));

    const events = await service.fetchEvents();
    expect(events).toEqual([]);
  });

  it('should handle HTTP error gracefully and return empty array', async () => {
    mockHttpService.get.mockReturnValueOnce(
      throwError(() => new Error('Service Unavailable')),
    );

    const events = await service.fetchEvents();
    expect(events).toEqual([]);
  });
});
