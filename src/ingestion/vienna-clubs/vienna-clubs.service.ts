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

@Injectable()
export class ViennaClubsService implements IEventProvider {
  private readonly logger = new Logger(ViennaClubsService.name);

  constructor(private readonly httpService: HttpService) {}

  async fetchEvents(): Promise<Prisma.EventCreateInput[]> {
    this.logger.log(
      'Fetching official club programs from Vienna venues (Flex, The Loft, Chelsea, U4, Weberknecht)...',
    );

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const tomorrowEnd = new Date(now);
    tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);
    tomorrowEnd.setHours(23, 59, 59, 999);

    const results: Prisma.EventCreateInput[] = [];

    // Parallel fetch with individual error isolation
    const fetchTasks = [
      this.fetchFlex(todayStart, tomorrowEnd),
      this.fetchTheLoft(todayStart, tomorrowEnd),
      this.fetchChelsea(todayStart, tomorrowEnd),
      this.fetchU4(todayStart, tomorrowEnd),
      this.fetchWeberknecht(todayStart, tomorrowEnd),
    ];

    const settled = await Promise.allSettled(fetchTasks);

    settled.forEach((res, index) => {
      const clubNames = ['Flex', 'The Loft', 'Chelsea', 'U4', 'Weberknecht'];
      const club = clubNames[index];
      if (res.status === 'fulfilled') {
        this.logger.log(`Extracted ${res.value.length} events from ${club}.`);
        results.push(...res.value);
      } else {
        this.logger.warn(`Failed to fetch events from ${club}: ${res.reason?.message || res.reason}`);
      }
    });

    this.logger.log(`Total events extracted from Vienna Clubs: ${results.length}.`);
    return results;
  }

  private async fetchFlex(todayStart: Date, tomorrowEnd: Date): Promise<Prisma.EventCreateInput[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get('https://flex.at', {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          },
          timeout: 6000,
        }),
      );
      return parseFlexEvents(response.data, todayStart, tomorrowEnd);
    } catch (err: any) {
      throw new Error(`Flex error: ${err.message}`);
    }
  }

  private async fetchTheLoft(todayStart: Date, tomorrowEnd: Date): Promise<Prisma.EventCreateInput[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get('https://www.theloft.at/wp-json/wp/v2/posts?_embed=1&per_page=30', {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          },
          timeout: 6000,
        }),
      );
      const posts = Array.isArray(response.data) ? response.data : [];
      return parseTheLoftEvents(posts, todayStart, tomorrowEnd);
    } catch (err: any) {
      throw new Error(`The Loft error: ${err.message}`);
    }
  }

  private async fetchChelsea(todayStart: Date, tomorrowEnd: Date): Promise<Prisma.EventCreateInput[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get('https://www.chelsea.co.at', {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          },
          timeout: 6000,
        }),
      );
      return parseChelseaEvents(response.data, todayStart, tomorrowEnd);
    } catch (err: any) {
      throw new Error(`Chelsea error: ${err.message}`);
    }
  }

  private async fetchU4(todayStart: Date, tomorrowEnd: Date): Promise<Prisma.EventCreateInput[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get('https://www.u4.at/events/', {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          },
          timeout: 6000,
        }),
      );
      return parseU4Events(response.data, todayStart, tomorrowEnd);
    } catch (err: any) {
      throw new Error(`U4 error: ${err.message}`);
    }
  }

  private async fetchWeberknecht(todayStart: Date, tomorrowEnd: Date): Promise<Prisma.EventCreateInput[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get('https://www.weberknecht.net', {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          },
          timeout: 6000,
        }),
      );
      return parseWeberknechtEvents(response.data, todayStart, tomorrowEnd);
    } catch (err: any) {
      throw new Error(`Weberknecht error: ${err.message}`);
    }
  }
}
