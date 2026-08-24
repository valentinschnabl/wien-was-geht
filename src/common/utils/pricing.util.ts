/**
 * Detects whether an event is free / admission-free based on text, provider signals and venue context.
 * Returns:
 * - true: Confirmed free for general adult admission
 * - false: Confirmed paid ticket / admission required
 * - null: Unknown / unspecified
 */

export const KNOWN_PAID_VENUES = [
  'kunsthistorisches museum',
  'khm',
  'naturhistorisches museum',
  'nhm',
  'albertina',
  'albertina modern',
  'belvedere',
  'oberes belvedere',
  'unteres belvedere',
  'belvedere 21',
  'mumok',
  'museum moderner kunst',
  'leopold museum',
  'mak',
  'museum für angewandte kunst',
  'museum fuer angewandte kunst',
  'technisches museum',
  'kunsthalle wien',
  'kunsthauswien',
  'kunsthaus wien',
  'museum hundertwasser',
  'haus der musik',
  'mozarthaus',
  'wiener staatsoper',
  'staatsoper',
  'volksoper',
  'burgtheater',
  'volkstheater',
  'akademietheater',
  'musikverein',
  'konzerthaus',
  'wiener konzerthaus',
  'theater an der wien',
  'ronacher',
  'raimund theater',
  'porgy & bess',
  'porgy and bess',
];

export function detectIsFree(
  provider: string,
  title?: string | null,
  description?: string | null,
  priceAmount?: number | null,
  venueName?: string | null,
): boolean | null {
  if (provider === 'EINTRITT_FREI' || provider === 'KULTURSOMMER') {
    return true;
  }

  if (typeof priceAmount === 'number' && priceAmount > 0) {
    return false;
  }

  const combined = `${title || ''} ${description || ''}`.toLowerCase();
  const venueLower = `${venueName || ''}`.toLowerCase().trim();

  // 1. Remove youth/child-only free phrases before evaluating general free admission
  // e.g. "Eintritt frei bis 19 Jahre", "Freier Eintritt für Kinder unter 6 Jahren"
  const sanitized = combined
    .replace(/\b(eintritt\s*frei|freier\s*eintritt|kostenlos|gratis)\s*(bis\s*\d+\s*(jahre|jahren|j\b)|für\s*(kinder|jugendliche|schüler|schueler|kleinkinder))\b/gi, '')
    .replace(/\b(kinder|jugendliche|schüler)\s*(bis\s*\d+\s*jahre)?\s*(haben\s*)?(freien\s*eintritt|eintritt\s*frei|gratis)\b/gi, '');

  const freePatterns = [
    /\beintritt\s*(ist\s*)?frei\b/i,
    /\bfreier?\s*eintritt\b/i,
    /\bkostenlos(e[rsnm]?)?\b/i,
    /\bgratis\b/i,
    /\bfree\s*entry\b/i,
    /\bfree\s*admission\b/i,
    /\bspendenbasis\b/i,
    /\bpay\s*as\s*you\s*wish\b/i,
    /\bfreie\s*spende\b/i,
    /\bohne\s*eintritt\b/i,
    /\bkein\s*eintritt\b/i,
    /\bkostenfrei(e[rsnm]?)?\b/i,
    /\bgebührenfrei(e[rsnm]?)?\b/i,
    /\beintritt\s*:\s*frei\b/i,
    /\beintritt\s*:\s*0\s*€?\b/i,
    /\beintritt\s*frei\s*bis\s*\d{1,2}(:\d{2}|\s*uhr)\b/i,
    /\btag\s*der\s*offenen\s*tür\b/i,
    /\bvernissage\b/i,
  ];

  const paidPatterns = [
    /\btickets?\s*(ab|von|um)\s*([1-9]\d*|€)/i,
    /\bvvk\s*[:€\s]*[1-9]/i,
    /\bak\s*[:€\s]*[1-9]/i,
    /\beintritt\s*[:€\s]*[1-9]\d*([.,]\d+)?\s*€/i,
    /\b[1-9]\d*([.,]\d+)?\s*€\s*eintritt\b/i,
    /\bticketpreis\b/i,
    /\bticket\s*kaufen\b/i,
  ];

  const hasPaidSignal = paidPatterns.some((pattern) => pattern.test(combined));
  const hasFreeSignal = freePatterns.some((pattern) => pattern.test(sanitized));

  // If there's an explicit paid ticket price (e.g. "Tickets ab 25€"), it is paid
  if (hasPaidSignal && !/^\s*(eintritt\s*frei|freier\s*eintritt)\b/i.test(title || '')) {
    return false;
  }

  // Check if the venue is a known paid federal/commercial museum or theatre
  const isMajorPaidVenue = KNOWN_PAID_VENUES.some((pv) => venueLower.includes(pv) || (title || '').toLowerCase().includes(pv));

  if (isMajorPaidVenue) {
    // For major museums & theatres, only mark free if there is an unambiguous free signal in sanitized text (e.g. Vernissage, Tag der offenen Tür, Freier Eintritt für alle)
    if (hasFreeSignal && (sanitized.includes('für alle') || sanitized.includes('vernissage') || sanitized.includes('offenen tür') || sanitized.includes('freie spende') || sanitized.includes('gratis eintritt'))) {
      return true;
    }
    // Otherwise standard exhibition / museum visit is paid
    return false;
  }

  if (priceAmount === 0) {
    return true;
  }

  if (hasFreeSignal) {
    return true;
  }

  if (hasPaidSignal || provider === 'TICKETMASTER') {
    return false;
  }

  return null;
}
