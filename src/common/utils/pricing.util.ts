/**
 * Detects whether an event is free / admission-free based on text and provider signals.
 * Returns:
 * - true: Confirmed free
 * - false: Confirmed paid
 * - null: Unknown / unspecified
 */
export function detectIsFree(
  provider: string,
  title?: string | null,
  description?: string | null,
  priceAmount?: number | null,
): boolean | null {
  if (provider === 'EINTRITT_FREI' || provider === 'KULTURSOMMER') {
    return true;
  }

  if (priceAmount === 0) {
    return true;
  }

  if (typeof priceAmount === 'number' && priceAmount > 0) {
    return false;
  }

  const combined = `${title || ''} ${description || ''}`.toLowerCase();

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
    /\beintritt\s*:\s*0\b/i,
    /\beintritt\s*frei\s*bis\b/i,
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
  const hasFreeSignal = freePatterns.some((pattern) => pattern.test(combined));

  // If there's an explicit paid ticket price (e.g. "Tickets ab 25€"), it is paid
  if (hasPaidSignal && !/^\s*(eintritt\s*frei|freier\s*eintritt)\b/i.test(title || '')) {
    return false;
  }

  if (hasFreeSignal) {
    return true;
  }

  if (hasPaidSignal) {
    return false;
  }

  if (provider === 'TICKETMASTER') {
    return false;
  }

  return null;
}
