import * as cheerio from 'cheerio';
import { Prisma } from '@prisma/client';
import { VIENNA_VENUES } from '../../../common/constants/vienna-venues';
import { detectIsFree } from '../../../common/utils/pricing.util';
import { applyViennaTime } from '../../../common/utils/time.util';

interface LoftPost {
  id?: number;
  date?: string;
  date_gmt?: string;
  link?: string;
  title?: { rendered?: string };
  excerpt?: { rendered?: string };
  content?: { rendered?: string };
  _embedded?: {
    'wp:featuredmedia'?: Array<{ source_url?: string }>;
  };
}

export function parseTheLoftEvents(
  posts: LoftPost[],
  todayStart: Date,
  tomorrowEnd: Date,
): Prisma.EventCreateInput[] {
  const events: Prisma.EventCreateInput[] = [];
  const venueCoords = VIENNA_VENUES['the loft'] || { lat: 48.2133, lng: 16.3401 };

  for (const post of posts) {
    if (!post.title?.rendered || !post.date) continue;

    const rawTitle = cheerio.load(post.title.rendered).text().trim();
    const rawDesc = cheerio.load(post.excerpt?.rendered || post.content?.rendered || '').text().trim();

    // The post date on WordPress is the publication or scheduled event date
    const parsedDate = new Date(post.date);
    if (isNaN(parsedDate.getTime())) continue;

    const start = applyViennaTime(parsedDate, 21, 0); // Loft party club nights start at 21:00 Vienna time

    if (start < todayStart || start > tomorrowEnd) continue;

    const end = new Date(start.getTime() + 6 * 3600000);
    const imageUrl = post._embedded?.['wp:featuredmedia']?.[0]?.source_url || null;
    const isFree = detectIsFree('VIENNA_CLUBS', rawTitle, rawDesc) ?? false;

    events.push({
      externalId: `theloft-${post.id || rawTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      provider: 'VIENNA_CLUBS',
      title: rawTitle,
      description: rawDesc ? rawDesc.substring(0, 1500) : null,
      category: 'Nightlife',
      url: post.link || 'https://www.theloft.at',
      imageUrl,
      startTime: start,
      endTime: end,
      venueName: 'The Loft',
      latitude: venueCoords.lat,
      longitude: venueCoords.lng,
      isFree,
    });
  }

  return events;
}
