import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { AxiosResponse } from 'axios';
import { BewegtImParkService } from './bewegt-im-park.service';

describe('BewegtImParkService', () => {
  let service: BewegtImParkService;
  let httpService: HttpService;

  const mockDistrictHtml = `
    <html>
      <body>
        <h3>Mittwoch</h3>
        <div>
          Kursdauer: 17.06. – 02.09. 18:00 – 19:00 Yoga in der Freien Mitte Ortsbezeichnung: (Parkanlage Nordbahnhof - Freie Mitte) Kursinfo
          Kursdauer: 17.06. – 02.09. 19:00 – 20:00 HiiT Outdoor Fitness Ortsbezeichnung: (Jesuitenwiese Prater) Kursinfo
        </div>
        <h3>Donnerstag</h3>
        <div>
          Kursdauer: 18.06. – 03.09. 18:30 – 19:30 Lauftraining und Intervall Ortsbezeichnung: (Zirkuswiese Prater) Kursinfo
        </div>
      </body>
    </html>
  `;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BewegtImParkService,
        {
          provide: HttpService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<BewegtImParkService>(BewegtImParkService);
    httpService = module.get<HttpService>(HttpService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('fetchEvents', () => {
    it('should successfully fetch and parse outdoor sport sessions', async () => {
      const response: AxiosResponse = {
        data: mockDistrictHtml,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      jest.spyOn(httpService, 'get').mockReturnValue(of(response));

      const events = await service.fetchEvents();
      expect(events.length).toBeGreaterThan(0);
      const first = events[0];
      expect(first.provider).toBe('BEWEGT_IM_PARK');
      expect(first.category).toBe('Sports');
      expect(first.isFree).toBe(true);
      expect(first.imageUrl).toBeNull();
      expect(first.latitude).toBeGreaterThan(48.1);
      expect(first.longitude).toBeGreaterThan(16.2);
    });

    it('should handle network errors gracefully without crashing', async () => {
      jest.spyOn(httpService, 'get').mockReturnValue(throwError(() => new Error('Network Error')));

      const events = await service.fetchEvents();
      expect(events).toEqual([]);
    });
  });
});
