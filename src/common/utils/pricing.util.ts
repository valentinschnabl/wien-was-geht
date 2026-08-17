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
    /\beintritt\s+frei\b/i,
    /\bfreier\s+eintritt\b/i,
    /\bkostenlos\b/i,
    /\bgratis\b/i,
    /\bfree\s+entry\b/i,
    /\bfree\s+admission\b/i,
    /\bspendenbasis\b/i,
    /\bpay\s+as\s+you\s+wish\b/i,
    /\bfreie\s+spende\b/i,
  ];

  for (const pattern of freePatterns) {
    if (pattern.test(combined)) {
      return true;
    }
  }

  const paidPatterns = [
    /\btickets?\s+ab\s+\d+/i,
    /\bvvk\s*[:€\d]/i,
    /\bak\s*[:€\d]/i,
    /\beintritt\s*[:€\s]*\d+/i,
    /\bticketpreis\b/i,
  ];

  for (const pattern of paidPatterns) {
    if (pattern.test(combined)) {
      return false;
    }
  }

  if (provider === 'TICKETMASTER') {
    return false;
  }

  return null;
}
