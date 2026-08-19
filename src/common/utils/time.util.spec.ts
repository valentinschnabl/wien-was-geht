import { createViennaDate, applyViennaTime } from './time.util';

describe('Time Utility (Europe/Vienna Timezone Handling)', () => {
  it('should create correct UTC timestamp for summer daylight saving time (CEST, UTC+2)', () => {
    // 19. August 2026 at 20:45 Vienna time should be 18:45:00 UTC
    const date = createViennaDate(2026, 8, 19, 20, 45);
    expect(date.toISOString()).toBe('2026-08-19T18:45:00.000Z');

    // In Vienna locale representation it must match exactly 20:45
    const viennaStr = date.toLocaleTimeString('de-AT', {
      timeZone: 'Europe/Vienna',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    expect(viennaStr).toBe('20:45');
  });

  it('should create correct UTC timestamp for winter standard time (CET, UTC+1)', () => {
    // 15. December 2026 at 20:00 Vienna time should be 19:00:00 UTC
    const date = createViennaDate(2026, 12, 15, 20, 0);
    expect(date.toISOString()).toBe('2026-12-15T19:00:00.000Z');

    const viennaStr = date.toLocaleTimeString('de-AT', {
      timeZone: 'Europe/Vienna',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    expect(viennaStr).toBe('20:00');
  });

  it('should apply Vienna time to a base date', () => {
    const base = new Date('2026-08-20T12:00:00.000Z');
    const result = applyViennaTime(base, 20, 0);

    const viennaStr = result.toLocaleTimeString('de-AT', {
      timeZone: 'Europe/Vienna',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    expect(viennaStr).toBe('20:00');
  });
});
