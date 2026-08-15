import { HttpModule, HttpService } from '@nestjs/axios';
import { Test, TestingModule } from '@nestjs/testing';
import { of, throwError } from 'rxjs';
import { AxiosResponse } from 'axios';
import { AiCategorizerService, EventCategory } from './ai-categorizer.service';
import { Prisma } from '@prisma/client';

describe('AiCategorizerService', () => {
  let service: AiCategorizerService;
  let httpService: HttpService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [HttpModule],
      providers: [AiCategorizerService],
    }).compile();

    service = module.get<AiCategorizerService>(AiCategorizerService);
    httpService = module.get<HttpService>(HttpService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Offline Keyword Heuristics Classifier', () => {
    it('should classify Nightlife & Party events accurately', () => {
      const nightlifeTitles = [
        ['Techno Rave Party', 'Live at Das Werk with local DJs'],
        ['SYNERGY x Trance Night', 'Afterhour at SASS Music Club'],
        ['Grelle Forelle Klubnacht', 'Hard Techno and Acid Basslines'],
        ['PRST Electronic Sessions', 'House, Electro, DJ set all night'],
        ['Flucc Wanne Dancefloor', 'Underground rave with international guest'],
      ];

      nightlifeTitles.forEach(([title, desc]) => {
        expect(service.classifyWithKeywords(title, desc)).toBe('Nightlife');
      });
    });

    it('should classify Music & Concert events accurately', () => {
      const musicTitles = [
        ['Wiener Philharmoniker Sommerkonzert', 'Klassisches Symphonieorchester in Schönbrunn'],
        ['JazzWerkstatt Wien Live', 'Acoustic Jazz Quartet at Porgy & Bess'],
        ['Rockband live im Gasometer', 'Gitarre, Schlagzeug und Gesang'],
        ['Wiener Singakademie Chorkonzert', 'Kammermusik und Chorgesang'],
        ['Klavierabend mit Schubert & Beethoven', 'Klassische Sonaten am Flügel'],
      ];

      musicTitles.forEach(([title, desc]) => {
        expect(service.classifyWithKeywords(title, desc)).toBe('Music');
      });
    });

    it('should classify Family & Children events accurately', () => {
      const familyTitles = [
        ['Kasperl & Pezi in der Urania', 'Traditionelles Puppentheater für Kinder ab 3 Jahren'],
        ['Mitmach-Workshop für Familien', 'Kreatives Basteln für Kleinkinder und Eltern'],
        ['Märchenstunde in der Bücherei', 'Geschichten für Kinder ab 4'],
        ['Kindertheater im Dschungel Wien', 'Interaktives Theaterstück für die ganze Familie'],
      ];

      familyTitles.forEach(([title, desc]) => {
        expect(service.classifyWithKeywords(title, desc)).toBe('Family');
      });
    });

    it('should classify Sports & Fitness events accurately', () => {
      const sportsTitles = [
        ['Yoga im Stadtpark bei Sonnenuntergang', 'Outdoor Fitness Workout für Anfänger'],
        ['Wiener Frauenlauf Vorbereitung', 'Gemeinsames Lauftraining und Marathon Vorbereitung'],
        ['Beachvolleyball Turnier', 'Sport und Wettkampf auf der Donauinsel'],
        ['Kletter-Workshop Blockfabrik', 'Bouldern und Klettersport für Einsteiger'],
        ['Stand-Up Paddling Donaukanal', 'Wassersport und Balance-Training'],
      ];

      sportsTitles.forEach(([title, desc]) => {
        expect(service.classifyWithKeywords(title, desc)).toBe('Sports');
      });
    });

    it('should classify Culinary & Food events accurately', () => {
      const culinaryTitles = [
        ['Wiener Weinverkostung in Grinzing', 'Grüner Veltliner und Heurigen Schmankerl Tasting'],
        ['Streetfood Festival Karlsplatz', 'Internationale Street Food Stände und Foodtrucks'],
        ['Craft Beer Verkostung', 'Handwerklich gebrautes Bier und Tastings'],
        ['Bio-Bauernmarkt am Yppenplatz', 'Frisches Obst, Gemüse und kulinarische Spezialitäten'],
        ['Wiener Schnitzel Kochkurs', 'Kulinarik-Workshop mit traditionellen Rezepten'],
      ];

      culinaryTitles.forEach(([title, desc]) => {
        expect(service.classifyWithKeywords(title, desc)).toBe('Culinary');
      });
    });

    it('should default cultural walks, museums, and theater to Culture', () => {
      const cultureTitles = [
        ['Stadtführung durch das jüdische Wien', 'Historischer Rundgang und Spaziergang im 1. Bezirk'],
        ['Albertina Moderne Kunstausstellung', 'Werke zeitgenössischer Künstler'],
        ['Burgtheater: Hamlet', 'Schauspiel und Theateraufführung auf der Hauptbühne'],
        ['Kabarett Simpl: Best of', 'Satirischer Abend im Wiener Traditionskabarett'],
        ['MuseumsQuartier Vernissage', 'Eröffnung der neuen Fotoausstellung'],
      ];

      cultureTitles.forEach(([title, desc]) => {
        expect(service.classifyWithKeywords(title, desc)).toBe('Culture');
      });
    });

    it('should gracefully handle empty or special-character input', () => {
      expect(service.classifyWithKeywords('', '')).toBe('Culture');
      expect(service.classifyWithKeywords('??? !!!', '$$$')).toBe('Culture');
      expect(service.classifyWithKeywords('12345', '67890')).toBe('Culture');
    });
  });

  describe('categorizeEvents with Gemini and Fallback', () => {
    it('should preserve events that already have valid explicit categories', async () => {
      const existingEvents: Prisma.EventCreateInput[] = [
        {
          externalId: 'ev-1',
          provider: 'RESIDENT_ADVISOR',
          title: 'Techno Night',
          venueName: 'Club Venue',
          category: 'Nightlife',
          startTime: new Date(),
          latitude: 48.2,
          longitude: 16.3,
        },
        {
          externalId: 'ev-2',
          provider: 'STADT_WIEN',
          title: 'Philharmoniker',
          venueName: 'Concert Hall',
          category: 'Music',
          startTime: new Date(),
          latitude: 48.2,
          longitude: 16.3,
        },
      ];

      const result = await service.categorizeEvents(existingEvents);
      expect(result).toHaveLength(2);
      expect(result[0].category).toBe('Nightlife');
      expect(result[1].category).toBe('Music');
    });

    it('should batch unclassified/General events and categorize via Gemini when API key is present', async () => {
      process.env.GEMINI_API_KEY = 'test-gemini-key';

      const mockGeminiResponse: AxiosResponse = {
        data: {
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify([
                      { id: '0', category: 'Nightlife' },
                      { id: '1', category: 'Music' },
                      { id: '2', category: 'Culture' },
                    ]),
                  },
                ],
              },
            },
          ],
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      jest.spyOn(httpService, 'post').mockReturnValue(of(mockGeminiResponse));

      const inputEvents: Prisma.EventCreateInput[] = [
        {
          externalId: 'g-1',
          provider: 'EVENTFROG',
          title: 'Rave Session',
          venueName: 'Venue A',
          category: 'General',
          startTime: new Date(),
          latitude: 48.2,
          longitude: 16.3,
        },
        {
          externalId: 'g-2',
          provider: 'EVENTFROG',
          title: 'Orchesterkonzert',
          venueName: 'Venue B',
          category: null as any,
          startTime: new Date(),
          latitude: 48.2,
          longitude: 16.3,
        },
        {
          externalId: 'g-3',
          provider: 'STADT_WIEN',
          title: 'Theateraufführung',
          venueName: 'Venue C',
          category: 'General',
          startTime: new Date(),
          latitude: 48.2,
          longitude: 16.3,
        },
      ];

      const result = await service.categorizeEvents(inputEvents);
      expect(result).toHaveLength(3);
      expect(result[0].category).toBe('Nightlife');
      expect(result[1].category).toBe('Music');
      expect(result[2].category).toBe('Culture');

      expect(httpService.post).toHaveBeenCalledTimes(1);
    });

    it('should seamlessly fallback to keyword heuristics if Gemini call fails with 500 error', async () => {
      process.env.GEMINI_API_KEY = 'test-gemini-key';

      jest
        .spyOn(httpService, 'post')
        .mockReturnValue(throwError(() => new Error('Gemini API 500 Internal Server Error')));

      const inputEvents: Prisma.EventCreateInput[] = [
        {
          externalId: 'fb-1',
          provider: 'EVENTFROG',
          title: 'Kasperltheater im Park',
          description: 'Puppenspiel für Kinder',
          venueName: 'Park A',
          category: 'General',
          startTime: new Date(),
          latitude: 48.2,
          longitude: 16.3,
        },
        {
          externalId: 'fb-2',
          provider: 'EVENTFROG',
          title: 'Yoga und Pilates Workout',
          description: 'Sport am Morgen',
          venueName: 'Park B',
          category: 'General',
          startTime: new Date(),
          latitude: 48.2,
          longitude: 16.3,
        },
      ];

      const result = await service.categorizeEvents(inputEvents);
      expect(result).toHaveLength(2);
      expect(result[0].category).toBe('Family');
      expect(result[1].category).toBe('Sports');
    });

    it('should fallback to keyword heuristics when GEMINI_API_KEY is not set', async () => {
      delete process.env.GEMINI_API_KEY;

      const inputEvents: Prisma.EventCreateInput[] = [
        {
          externalId: 'nk-1',
          provider: 'EVENTFROG',
          title: 'Weinverkostung und Heuriger',
          venueName: 'Heuriger Grinzing',
          category: 'General',
          startTime: new Date(),
          latitude: 48.2,
          longitude: 16.3,
        },
      ];

      const result = await service.categorizeEvents(inputEvents);
      expect(result[0].category).toBe('Culinary');
    });
  });
});
