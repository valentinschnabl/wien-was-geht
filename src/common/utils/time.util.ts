/**
 * Utility for parsing and creating timestamps in the Europe/Vienna timezone.
 * Ensures consistent UTC storage in databases regardless of the server system timezone.
 */

export function createViennaDate(
  yearOrDateStr: number | string,
  monthOrTimeStr?: number | string,
  day?: number,
  hour = 0,
  minute = 0,
  second = 0,
): Date {
  const pad = (n: number) => String(n).padStart(2, '0');

  if (typeof yearOrDateStr === 'string') {
    const dateStr = yearOrDateStr.trim();
    const timeStr = typeof monthOrTimeStr === 'string' ? monthOrTimeStr.trim() : '00:00:00';

    let y = 0, m = 0, d = 0;
    if (dateStr.includes('-')) {
      const parts = dateStr.split('T')[0].split('-');
      y = parseInt(parts[0], 10);
      m = parseInt(parts[1], 10);
      d = parseInt(parts[2], 10);
    } else if (dateStr.includes('.')) {
      const parts = dateStr.split('.');
      d = parseInt(parts[0], 10);
      m = parseInt(parts[1], 10);
      y = parseInt(parts[2], 10);
    }

    let h = 0, min = 0, s = 0;
    if (timeStr) {
      const tParts = timeStr.split(':');
      h = parseInt(tParts[0] || '0', 10);
      min = parseInt(tParts[1] || '0', 10);
      s = parseInt(tParts[2] || '0', 10);
    }

    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      const testDate = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Europe/Vienna',
        timeZoneName: 'longOffset',
      }).formatToParts(testDate);
      const offsetPart = parts.find((p) => p.type === 'timeZoneName');
      const offset = offsetPart ? offsetPart.value.replace('GMT', '') : '+02:00';
      return new Date(`${y}-${pad(m)}-${pad(d)}T${pad(h)}:${pad(min)}:${pad(s)}${offset}`);
    }
  }

  const y = Number(yearOrDateStr);
  const m = Number(monthOrTimeStr || 1);
  const d = Number(day || 1);

  // Determine daylight saving offset for Vienna on this specific date
  const testDate = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Vienna',
    timeZoneName: 'longOffset',
  }).formatToParts(testDate);

  const offsetPart = parts.find((p) => p.type === 'timeZoneName');
  const offset = offsetPart ? offsetPart.value.replace('GMT', '') : '+02:00';

  return new Date(
    `${y}-${pad(m)}-${pad(d)}T${pad(hour)}:${pad(minute)}:${pad(second)}${offset}`,
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
