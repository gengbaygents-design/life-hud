import { describe, it, expect } from 'vitest';
import { quietDelivery as deliver } from '../src/resources/reminder-rules/quiet';
const quietDelivery = (
  patch: Partial<Parameters<typeof deliver>[0]>,
  date: Date,
) =>
  deliver(
    {
      timeZone: 'Asia/Shanghai',
      priority: 'P2',
      quietStart: '23:30',
      quietEnd: '07:30',
      quietHoursPolicy: 'DEFER',
      ...patch,
    },
    date,
  );

const SH = 'Asia/Shanghai';
const NY = 'America/New_York';

describe('quietDelivery defaults: Shanghai 23:30-07:30, DEFER, P2', () => {
  it('defers ordinary 00:40 to 07:30 same day', () => {
    const r = quietDelivery(
      { timeZone: SH },
      new Date('2026-01-15T00:40:00+08:00'),
    );
    expect(r.next).toEqual(new Date('2026-01-15T07:30:00+08:00'));
    expect(r.silent).toBe(false);
  });

  it('delivers immediately exactly at quiet end 07:30', () => {
    const t = new Date('2026-01-15T07:30:00+08:00');
    expect(quietDelivery({ timeZone: SH }, t)).toEqual({
      next: t,
      silent: false,
    });
  });

  it('defers exactly at quiet start 23:30 to next day 07:30', () => {
    const r = quietDelivery(
      { timeZone: SH },
      new Date('2026-01-15T23:30:00+08:00'),
    );
    expect(r.next).toEqual(new Date('2026-01-16T07:30:00+08:00'));
    expect(r.silent).toBe(false);
  });

  it('SILENT policy delivers immediately but silent', () => {
    const t = new Date('2026-01-15T00:40:00+08:00');
    expect(
      quietDelivery({ timeZone: SH, quietHoursPolicy: 'SILENT' }, t),
    ).toEqual({ next: t, silent: true });
  });

  it('P0 bypasses quiet hours with silent false', () => {
    const t = new Date('2026-01-15T00:40:00+08:00');
    expect(quietDelivery({ timeZone: SH, priority: 'P0' }, t)).toEqual({
      next: t,
      silent: false,
    });
  });

  it('daytime 12:00 is outside the quiet window', () => {
    const t = new Date('2026-01-15T12:00:00+08:00');
    expect(quietDelivery({ timeZone: SH }, t)).toEqual({
      next: t,
      silent: false,
    });
  });

  it('disabled window start=end is never quiet', () => {
    const t = new Date('2026-01-15T00:40:00+08:00');
    expect(
      quietDelivery(
        { timeZone: SH, quietStart: '23:30', quietEnd: '23:30' },
        t,
      ),
    ).toEqual({ next: t, silent: false });
  });
});

describe('quietDelivery DST: America/New_York quiet 01:00-04:00', () => {
  it('spring-forward gap: 2026-03-08T06:30Z defers to 08:00Z', () => {
    const r = quietDelivery(
      { timeZone: NY, quietStart: '01:00', quietEnd: '04:00' },
      new Date('2026-03-08T06:30:00Z'),
    );
    expect(r.next.toISOString()).toBe('2026-03-08T08:00:00.000Z');
    expect(r.silent).toBe(false);
  });

  it('fall-back repeat: 2026-11-01T05:30Z defers to 09:00Z', () => {
    const r = quietDelivery(
      { timeZone: NY, quietStart: '01:00', quietEnd: '04:00' },
      new Date('2026-11-01T05:30:00Z'),
    );
    expect(r.next.toISOString()).toBe('2026-11-01T09:00:00.000Z');
    expect(r.silent).toBe(false);
  });
});
