import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { AxiosResponse } from 'axios';
import { WienLaeuftService } from './wienlaeuft.service';

describe('WienLaeuftService', () => {
  let service: WienLaeuftService;
  let httpService: HttpService;

  const mockEventsHtml = `
    <html>
      <body>
        <table>
          <tr>
            <td>
              <a href="de/eventdbshow-augartenlauf-30.08.2026">Augartenlauf</a>
              Ort: 1020 im Augarten beim Restaurant Sperling; (Eingang Obere Augartenstraße 1)
            </td>
          </tr>
          <tr>
            <td>
              <a href="de/eventdbshow-vienna-night-run-17.09.2026">vienna night run</a>
              Ort: Heldenplatz
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WienLaeuftService,
        {
          provide: HttpService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<WienLaeuftService>(WienLaeuftService);
    httpService = module.get<HttpService>(HttpService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('fetchEvents', () => {
    it('should fetch and parse running race events', async () => {
      const response: AxiosResponse = {
        data: mockEventsHtml,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      jest.spyOn(httpService, 'get').mockReturnValue(of(response));

      const events = await service.fetchEvents();
      expect(events.length).toBe(2);
      expect(events[0].provider).toBe('WIENLAEUFT');
      expect(events[0].category).toBe('Sports');
      expect(events[0].title).toContain('Augartenlauf');
      expect(events[0].latitude).toBeGreaterThan(48.1);
      expect(events[0].longitude).toBeGreaterThan(16.2);
    });

    it('should handle network errors gracefully without throwing', async () => {
      jest.spyOn(httpService, 'get').mockReturnValue(throwError(() => new Error('Service Unavailable')));

      const events = await service.fetchEvents();
      expect(events).toEqual([]);
    });
  });
});
