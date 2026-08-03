import { Prisma } from '@prisma/client';

export interface IEventProvider {
  /**
   * Fetches events from the third-party source and normalizes them
   * into the internal Prisma Event format.
   */
  fetchEvents(): Promise<Prisma.EventCreateInput[]>;
}
