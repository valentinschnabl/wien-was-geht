import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Prisma } from '@prisma/client';
import { IEventProvider } from '../../interfaces/event-provider.interface';
import { parseFlexEvents } from './adapters/flex.adapter';
import { parseTheLoftEvents } from './adapters/the-loft.adapter';
import { parseChelseaEvents } from './adapters/chelsea.adapter';
import { parseU4Events } from './adapters/u4.adapter';
import { parseWeberknechtEvents } from './adapters/weberknecht.adapter';
import { parseViperRoomEvents } from './adapters/viper-room.adapter';
import { parseJazzClubEvents } from './adapters/jazz.adapter';
import { parseGuertelAndBarEvents } from './adapters/guertel.adapter';
import { parseOpenAirAndStageEvents } from './adapters/openair.adapter';
import { parseGenericClubEvents } from './adapters/generic-club-feed.adapter';

interface ClubTarget {
  name: string;
  url: string;
  category: string;
  customParser?: (htmlOrData: any, todayStart: Date, tomorrowEnd: Date) => Prisma.EventCreateInput[];
}

@Injectable()
export class ViennaClubsService implements IEventProvider {
  private readonly logger = new Logger(ViennaClubsService.name);

  constructor(private readonly httpService: HttpService) {}

  async fetchEvents(): Promise<Prisma.EventCreateInput[]> {
    this.logger.log('Fetching official club and live music programs across Vienna...');

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const tomorrowEnd = new Date(now);
    tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);
    tomorrowEnd.setHours(23, 59, 59, 999);

    const clubTargets: ClubTarget[] = [
      // 1. Specialized Club Adapters
      { name: 'Flex', url: 'https://flex.at', category: 'Nightlife', customParser: parseFlexEvents },
      { name: 'The Loft', url: 'https://www.theloft.at/wp-json/wp/v2/posts?_embed=1&per_page=30', category: 'Nightlife', customParser: parseTheLoftEvents },
      { name: 'Chelsea', url: 'https://www.chelsea.co.at', category: 'Music', customParser: parseChelseaEvents },
      { name: 'U4', url: 'https://www.u4.at/events/', category: 'Nightlife', customParser: parseU4Events },
      { name: 'Weberknecht', url: 'https://www.weberknecht.net', category: 'Nightlife', customParser: parseWeberknechtEvents },
      { name: 'Viper Room', url: 'https://www.viper-room.at', category: 'Music', customParser: parseViperRoomEvents },

      // 2. Jazz & Live Sessions (Stufe 1)
      { name: 'Jazzland', url: 'https://www.jazzland.at', category: 'Music', customParser: (html, start, end) => parseJazzClubEvents(html, 'Jazzland', start, end) },
      { name: 'Zwe', url: 'https://www.zwe.cc', category: 'Music', customParser: (html, start, end) => parseJazzClubEvents(html, 'Zwe', start, end) },
      { name: 'Frau Mayer', url: 'https://www.fraumayer.at', category: 'Music', customParser: (html, start, end) => parseJazzClubEvents(html, 'Frau Mayer', start, end) },

      // 3. Gürtel, Bars & Schrammeln (Stufe 2)
      { name: 'Cabaret Fledermaus', url: 'https://www.fledermaus.at', category: 'Nightlife', customParser: (html, start, end) => parseGuertelAndBarEvents(html, 'Fledermaus', start, end) },
      { name: 'Tanzcafé Jenseits', url: 'https://tanzcafe-jenseits.com', category: 'Nightlife', customParser: (html, start, end) => parseGuertelAndBarEvents(html, 'Jenseits', start, end) },
      { name: 'Cafe Carina', url: 'https://cafecarina.at', category: 'Music', customParser: (html, start, end) => parseGuertelAndBarEvents(html, 'Carina', start, end) },
      { name: 'Café Concerto', url: 'https://cafeconcerto.at', category: 'Music', customParser: (html, start, end) => parseGuertelAndBarEvents(html, 'Concerto', start, end) },
      { name: 'Heuriger Zum Martin Sepp', url: 'https://martinsepp.at', category: 'Music', customParser: (html, start, end) => parseGuertelAndBarEvents(html, 'Martin Sepp', start, end) },

      // 4. Open-Air, Sommerkultur & Bühnen (Stufe 3)
      { name: 'Museumsquartier', url: 'https://www.mqw.at', category: 'Music', customParser: (html, start, end) => parseOpenAirAndStageEvents(html, 'MQ', start, end) },
      { name: 'Afrika Tage Wien', url: 'https://wien.afrika-tage.de', category: 'Music', customParser: (html, start, end) => parseOpenAirAndStageEvents(html, 'AfrikaTage', start, end) },
      { name: 'Szene Wien', url: 'https://szenewien.com', category: 'Music', customParser: (html, start, end) => parseOpenAirAndStageEvents(html, 'SzeneWien', start, end) },
      { name: 'Arena Wien', url: 'https://arena.wien', category: 'Music', customParser: (html, start, end) => parseOpenAirAndStageEvents(html, 'Arena', start, end) },

      // 5. Electronic & Underground Clubs
      { name: 'Grelle Forelle', url: 'https://www.grelleforelle.com', category: 'Nightlife' },
      { name: 'Das Werk', url: 'https://www.daswerk.org', category: 'Nightlife' },
      { name: 'EXIL Club', url: 'https://clubexil.at', category: 'Nightlife' },
      { name: 'SASS Music Club', url: 'https://sassmusicclub.at', category: 'Nightlife' },
      { name: 'DonauTechno', url: 'https://www.donautechno.com', category: 'Nightlife' },
      { name: 'Flucc', url: 'https://www.fluc.at', category: 'Nightlife' },
      { name: 'Celeste', url: 'https://www.celeste.co.at', category: 'Nightlife' },
      { name: 'O – der Klub', url: 'https://o-klub.at/events/', category: 'Nightlife' },
      { name: 'Prater Dome', url: 'https://praterdome.at/events', category: 'Nightlife' },
      { name: 'Babenberger Passage', url: 'https://www.babenbergerpassage.at/', category: 'Nightlife' },
      { name: 'VIE i PEE', url: 'https://vieipee.com/', category: 'Nightlife' },
      { name: 'B72', url: 'https://www.b72.at', category: 'Music' },
      { name: 'Rhiz', url: 'https://rhiz.wien', category: 'Music' },
      { name: 'Kramladen', url: 'https://kramladen.wien', category: 'Music' },
      { name: 'Venster 99', url: 'https://venster99.at', category: 'Music' },
      { name: 'WUK', url: 'https://www.wuk.at/programm/', category: 'Culture' },
      { name: 'Wiener Gasometer', url: 'https://www.planet.tt', category: 'Music' },
      { name: 'USUS am Wasser', url: 'https://amwasser.wien/event', category: 'Culture' },
      { name: 'Schikaneder', url: 'https://schikaneder.at/kino/kinoprogramm', category: 'Culture' },
    ];

    const results: Prisma.EventCreateInput[] = [];

    // Parallel fetch with individual error isolation (Promise.allSettled)
    const fetchTasks = clubTargets.map((target) =>
      this.fetchSingleClub(target, todayStart, tomorrowEnd),
    );

    const settled = await Promise.allSettled(fetchTasks);

    settled.forEach((res, index) => {
      const club = clubTargets[index].name;
      if (res.status === 'fulfilled') {
        if (res.value.length > 0) {
          this.logger.log(`Extracted ${res.value.length} events from ${club}.`);
        }
        results.push(...res.value);
      } else {
        this.logger.debug(`Skipped/Inactive ${club}: ${res.reason?.message || res.reason}`);
      }
    });

    this.logger.log(`Total events extracted across Vienna Clubs: ${results.length}.`);
    return results;
  }

  private async fetchSingleClub(
    target: ClubTarget,
    todayStart: Date,
    tomorrowEnd: Date,
  ): Promise<Prisma.EventCreateInput[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(target.url, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            Accept: 'text/html,application/xhtml+xml,application/xml,application/json;q=0.9,*/*;q=0.8',
          },
          timeout: 5000,
        }),
      );

      if (target.customParser) {
        return target.customParser(response.data, todayStart, tomorrowEnd);
      }

      const html = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
      return parseGenericClubEvents(html, target.name, target.category, todayStart, tomorrowEnd, target.url);
    } catch (err: any) {
      // Fallback: If site timeout/503 occurs but customParser is present, try invoking parser with empty html
      if (target.customParser) {
        try {
          return target.customParser('', todayStart, tomorrowEnd);
        } catch {}
      }
      throw new Error(`${target.name} error: ${err.message}`);
    }
  }
}
