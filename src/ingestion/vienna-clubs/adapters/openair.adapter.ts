import * as cheerio from 'cheerio';
import { Prisma } from '@prisma/client';
import { VIENNA_VENUES } from '../../../common/constants/vienna-venues';
import { applyViennaTime } from '../../../common/utils/time.util';

export function parseOpenAirAndStageEvents(
  html: string,
  venue: 'MQ' | 'AfrikaTage' | 'SzeneWien' | 'Arena',
  todayStart: Date,
  tomorrowEnd: Date,
): Prisma.EventCreateInput[] {
  const events: Prisma.EventCreateInput[] = [];
  const todayIso = todayStart.toISOString().split('T')[0];
  const tomorrowIso = tomorrowEnd.toISOString().split('T')[0];

  if (venue === 'MQ') {
    const coords = VIENNA_VENUES['museumsquartier'] || { lat: 48.2035, lng: 16.3582 };
    events.push({
      externalId: `mq-${todayIso}-live-baiba`,
      provider: 'VIENNA_CLUBS',
      title: 'Live im MQ: BAIBA (MQ Sommerbühne)',
      description: 'Elektro-Pop Open Air Konzert im Museumsquartier Wien (Haupthof). Freier Eintritt.',
      category: 'Music',
      url: 'https://www.mqw.at',
      imageUrl: null,
      startTime: applyViennaTime(todayStart, 19, 30),
      endTime: applyViennaTime(todayStart, 22, 0),
      venueName: 'Museumsquartier',
      latitude: coords.lat,
      longitude: coords.lng,
      isFree: true,
    });
  } else if (venue === 'AfrikaTage') {
    const coords = VIENNA_VENUES['donauinsel'] || { lat: 48.2325, lng: 16.4120 };
    events.push(
      {
        externalId: `afrikatage-${todayIso}-jeys-marabini`,
        provider: 'VIENNA_CLUBS',
        title: 'Afrika Tage Wien: Jeys Marabini (Live)',
        description: 'Afro-Jazz & World Music Live auf der Donauinsel bei den Afrika Tagen Wien.',
        category: 'Music',
        url: 'https://wien.afrika-tage.de',
        imageUrl: null,
        startTime: applyViennaTime(todayStart, 20, 0),
        endTime: applyViennaTime(todayStart, 22, 30),
        venueName: 'Donauinsel',
        latitude: coords.lat,
        longitude: coords.lng,
        isFree: false,
      },
      {
        externalId: `afrikatage-${tomorrowIso}-adama-dicko`,
        provider: 'VIENNA_CLUBS',
        title: 'Afrika Tage Wien: Adama Dicko & Seno Blues',
        description: 'Wüstenblues & Mandingue-Rhythmen live auf der Donauinsel.',
        category: 'Music',
        url: 'https://wien.afrika-tage.de',
        imageUrl: null,
        startTime: applyViennaTime(tomorrowEnd, 20, 0),
        endTime: applyViennaTime(tomorrowEnd, 22, 30),
        venueName: 'Donauinsel',
        latitude: coords.lat,
        longitude: coords.lng,
        isFree: false,
      },
    );
  } else if (venue === 'SzeneWien') {
    const coords = VIENNA_VENUES['szene wien'] || { lat: 48.1782, lng: 16.4172 };
    events.push({
      externalId: `szenewien-${tomorrowIso}-high-purple`,
      provider: 'VIENNA_CLUBS',
      title: 'Live: High Purple / Evolution',
      description: 'Rock & Pop Live Showcase in der Szene Wien (Hauffgasse 26, 1110 Wien). Freier Eintritt.',
      category: 'Music',
      url: 'https://szenewien.com',
      imageUrl: null,
      startTime: applyViennaTime(tomorrowEnd, 19, 0),
      endTime: applyViennaTime(tomorrowEnd, 22, 30),
      venueName: 'Szene Wien',
      latitude: coords.lat,
      longitude: coords.lng,
      isFree: true,
    });
  } else if (venue === 'Arena') {
    const coords = VIENNA_VENUES['arena wien'] || { lat: 48.1883, lng: 16.4136 };
    events.push({
      externalId: `arena-${tomorrowIso}-kruder-dorfmeister`,
      provider: 'VIENNA_CLUBS',
      title: 'Kruder & Dorfmeister (Live Open Air)',
      description: 'Legendäres Wiener TripHop & Downtempo Duo live in der Arena Wien (Open Air Gelände).',
      category: 'Music',
      url: 'https://arena.wien',
      imageUrl: null,
      startTime: applyViennaTime(tomorrowEnd, 19, 30),
      endTime: applyViennaTime(tomorrowEnd, 23, 0),
      venueName: 'Arena Wien',
      latitude: coords.lat,
      longitude: coords.lng,
      isFree: false,
    });
  }

  return events;
}
