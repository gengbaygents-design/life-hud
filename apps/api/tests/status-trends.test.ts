import { describe, it, expect } from 'vitest';
import {
  inWindow,
  waterTrend,
  sleepDuration,
} from '../src/resources/status/methods/trends';
describe('status facts and local date windows', () => {
  const now = new Date('2026-10-16T06:30:00Z');
  it('uses local dates across midnight and excludes future entries', () => {
    expect(
      inWindow(new Date('2026-10-15T16:01:00Z'), now, 'Asia/Shanghai', 1),
    ).toBe(true);
    expect(
      inWindow(new Date('2026-10-15T15:59:00Z'), now, 'Asia/Shanghai', 1),
    ).toBe(false);
    expect(
      inWindow(new Date('2026-10-16T07:00:00Z'), now, 'Asia/Shanghai', 30),
    ).toBe(false);
  });
  it('sums facts without target, diagnosis or missing-day fabrication', () => {
    const rows = [
      { recordedAt: new Date('2026-10-16T02:30:00Z'), amountMl: 300 },
      { recordedAt: new Date('2026-10-16T05:40:00Z'), amountMl: 250 },
    ];
    expect(waterTrend(rows, now, 'Asia/Shanghai', 7)).toEqual([
      { day: '2026-10-16', amountMl: 550 },
    ]);
    expect(rows).toHaveLength(2);
  });
  it('derives 6 hours 55 minutes across a date boundary', () => {
    expect(
      sleepDuration(
        new Date('2026-10-15T17:10:00Z'),
        new Date('2026-10-16T00:05:00Z'),
      ),
    ).toBe(415);
  });
});
