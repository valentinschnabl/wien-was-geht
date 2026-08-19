/**
 * Utility for parsing and creating timestamps in the Europe/Vienna timezone.
 * Ensures consistent UTC storage in databases regardless of the server system timezone.
 */

/**
 * Creates a Date object representing a specific local calendar date and time in Vienna (Europe/Vienna).
 * Correctly accounts for Daylight Saving Time (CEST: UTC+2 in summer, CET: UTC+1 in winter).
 *
 * @param year e.g. 2026
 * @param month 1-12 (January is 1, August is 8)
 * @param day 1-31
 * @param hour 0-23 (default 0)
 * @param minute 0-59 (default 0)
 * @param second 0-59 (default 0)
 */
export function createViennaDate(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
): Date {
  const pad = (n: number) => String(n).padStart(2, '0');

  // Determine daylight saving offset for Vienna on this specific date
  const testDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Vienna',
    timeZoneName: 'longOffset',
  }).formatToParts(testDate);

  const offsetPart = parts.find((p) => p.type === 'timeZoneName');
  const offset = offsetPart ? offsetPart.value.replace('GMT', '') : '+02:00';

  return new Date(
    `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:${pad(second)}${offset}`,
  );
}

/**
 * Creates a Vienna Date by taking an existing Date (or day reference) and applying Vienna local hour and minute.
 */
export function applyViennaTime(
  baseDate: Date,
  hour = 0,
  minute = 0,
  second = 0,
): Date {
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth() + 1;
  const day = baseDate.getDate();
  return createViennaDate(year, month, day, hour, minute, second);
}
