import { describe, expect, it } from 'vitest';
import {
  selectClasses,
  selectClockNow,
  TimetableRow,
} from '../src/resources/class-sessions/methods/timetable';

const SH = 'Asia/Shanghai';

function row(
  id: string,
  specificDate: string,
  startTime: string,
  endTime: string,
  timeZone = SH,
): TimetableRow {
  return { id, specificDate, startTime, endTime, timeZone };
}

const rows = [
  row('a', '2026-10-16', '09:00', '10:00'),
  row('b', '2026-10-16', '11:00', '12:00'),
  row('c', '2026-10-17', '08:00', '09:00'),
];

const utc = (iso: string) => new Date(iso);

describe('selectClasses (Asia/Shanghai = UTC+8)', () => {
  it('before first start: nothing current, earliest is next', () => {
    const r = selectClasses(rows, utc('2026-10-16T00:30:00Z')); // 08:30 SH
    expect(r.current).toBeNull();
    expect(r.next?.id).toBe('a');
    expect(r.today.map((x) => x.id)).toEqual(['a', 'b']);
  });

  it('start inclusive: exactly at startTime class is current', () => {
    const r = selectClasses(rows, utc('2026-10-16T01:00:00Z')); // 09:00 SH
    expect(r.current?.id).toBe('a');
    expect(r.next?.id).toBe('b');
  });

  it('during a class: current with later class next', () => {
    const r = selectClasses(rows, utc('2026-10-16T01:30:00Z')); // 09:30 SH
    expect(r.current?.id).toBe('a');
    expect(r.next?.id).toBe('b');
  });

  it('end exclusive: exactly at endTime current rolls off', () => {
    const r = selectClasses(rows, utc('2026-10-16T02:00:00Z')); // 10:00 SH
    expect(r.current).toBeNull();
    expect(r.next?.id).toBe('b');
  });

  it('after last class today: next is tomorrow', () => {
    const r = selectClasses(rows, utc('2026-10-16T04:30:00Z')); // 12:30 SH
    expect(r.current).toBeNull();
    expect(r.next?.id).toBe('c');
    expect(r.today.map((x) => x.id)).toEqual(['a', 'b']);
  });

  it('date rollover: tomorrow class becomes current then nothing remains', () => {
    const during = selectClasses(rows, utc('2026-10-17T00:00:00Z')); // Oct 17 08:00 SH
    expect(during.today.map((x) => x.id)).toEqual(['c']);
    expect(during.current?.id).toBe('c');
    expect(during.next).toBeNull();

    const after = selectClasses(rows, utc('2026-10-17T01:00:00Z')); // Oct 17 09:00 SH
    expect(after.current).toBeNull();
    expect(after.next).toBeNull();
    expect(after.today.map((x) => x.id)).toEqual(['c']);
  });

  it('today sorted by date, time, then id on ties', () => {
    const tied = [
      row('z', '2026-10-16', '09:00', '10:00'),
      row('y', '2026-10-16', '09:00', '10:00'),
      row('a', '2026-10-16', '08:00', '08:30'),
    ];
    const r = selectClasses(tied, utc('2026-10-15T16:00:00Z')); // Oct 16 00:00 SH
    expect(r.today.map((x) => x.id)).toEqual(['a', 'y', 'z']);
    expect(r.next?.id).toBe('a');
  });

  it('per-row timezone: UTC row current while Shanghai day already rolled over', () => {
    const mixed = [
      row('u1', '2026-10-16', '16:30', '17:30', 'UTC'),
      row('s1', '2026-10-17', '08:00', '09:00', SH),
    ];
    const r = selectClasses(mixed, utc('2026-10-16T17:00:00Z')); // 17:00 UTC = Oct 17 01:00 SH
    expect(r.current?.id).toBe('u1');
    expect(r.next?.id).toBe('s1');
    expect(r.today.map((x) => x.id)).toEqual(['u1', 's1']);
  });

  it('does not mutate input rows', () => {
    const snapshot = JSON.parse(JSON.stringify(rows));
    selectClasses(rows, utc('2026-10-16T01:30:00Z'));
    expect(rows).toEqual(snapshot);
  });
  it('orders future classes by actual instant across different time zones', () => {
    const mixed = [
      row('utc-later', '2026-10-16', '10:00', '11:00', 'UTC'),
      row('sh-earlier', '2026-10-16', '11:00', '12:00', SH),
    ];
    expect(selectClasses(mixed, utc('2026-10-16T01:00:00Z')).next?.id).toBe(
      'sh-earlier',
    );
  });
});

describe('selectClockNow', () => {
  const real = utc('2026-10-16T01:30:00Z');

  it('development uses valid ISO DEV_NOW', () => {
    const clock = selectClockNow(
      { APP_ENV: 'development', DEV_NOW: '2026-10-16T01:00:00Z' },
      real,
    );
    expect(clock.toISOString()).toBe('2026-10-16T01:00:00.000Z');
  });

  it('development without DEV_NOW falls back to the real clock', () => {
    expect(selectClockNow({ APP_ENV: 'development' }, real)).toBe(real);
  });

  it('development with invalid DEV_NOW throws', () => {
    expect(() =>
      selectClockNow({ APP_ENV: 'development', DEV_NOW: '10/16/2026' }, real),
    ).toThrow();
    expect(() =>
      selectClockNow({ APP_ENV: 'development', DEV_NOW: 'not-a-date' }, real),
    ).toThrow();
    expect(() =>
      selectClockNow({ APP_ENV: 'development', DEV_NOW: '' }, real),
    ).toThrow();
  });

  it('production and test ignore DEV_NOW', () => {
    expect(
      selectClockNow(
        { APP_ENV: 'production', DEV_NOW: '2020-01-01T00:00:00Z' },
        real,
      ),
    ).toBe(real);
    expect(
      selectClockNow(
        { APP_ENV: 'test', DEV_NOW: '2020-01-01T00:00:00Z' },
        real,
      ),
    ).toBe(real);
    expect(selectClockNow({ DEV_NOW: '2020-01-01T00:00:00Z' }, real)).toBe(
      real,
    );
  });
});
