import { describe, it, expect } from 'vitest';
import { createSchema as reminder } from '../src/resources/reminder-rules/contract';
import {
  createSchema as log,
  updateSchema,
} from '../src/resources/captain-logs/contract';
import {
  createSchema as marker,
  querySchema,
} from '../src/resources/archive-entries/contract';
import { parseAction } from '../src/resources/lim/actions';
import { canCreateLog } from '../src/resources/captain-logs/author';
import type { ContextPack } from '../src/resources/lim/types';
const id = '00000000-0000-4000-8000-000000000001';
describe('Reminder/Archive authority contracts', () => {
  it('uses named IANA zones instead of ambiguous SQL offset syntax',()=>{expect(querySchema.safeParse({timeZone:'+08:00'}).success).toBe(false);expect(querySchema.safeParse({timeZone:'Asia/Shanghai'}).success).toBe(true);});
  it('parses explicit GET privacy booleans without truthy-string escalation', () => {
    expect(
      querySchema.parse({ includeSensitive: 'false' }).includeSensitive,
    ).toBe(false);
    expect(
      querySchema.parse({ includeSensitive: 'true' }).includeSensitive,
    ).toBe(true);
    expect(querySchema.safeParse({ includeSensitive: 'yes' }).success).toBe(
      false,
    );
  });
  it('separates manual reminder from task creation and rejects client owner/cron', () => {
    const input = { title: '拿快递', scheduledAt: '2030-10-17T08:00:00Z' };
    expect(reminder.parse(input).priority).toBe('P2');
    for (const patch of [
      { ownerId: 'foreign' },
      { scheduleType: 'CRON' },
      { cronExpression: '* * * * *' },
      { sourceType: 'TASK' },
    ])
      expect(reminder.safeParse({ ...input, ...patch }).success).toBe(false);
  });
  it('validates quiet boundaries, time zones and paired references', () => {
    for (const patch of [
      { quietStart: '25:00' },
      { quietEnd: '7:30' },
      { timeZone: 'Not/AZone' },
      { sourceId: id },
    ])
      expect(
        reminder.safeParse({
          title: '提醒',
          scheduledAt: '2030-10-17T08:00:00Z',
          ...patch,
        }).success,
      ).toBe(false);
  });
  it('retains exact authored whitespace and keeps partial edits partial', () => {
    const body = '  今天\r\nLIFE HUD\n\n';
    expect(log.parse({ body }).body).toBe(body);
    expect(
      updateSchema.parse({ id, version: 1, aiAccessPolicy: 'NEVER' }),
    ).toEqual({ id, version: 1, aiAccessPolicy: 'NEVER' });
    expect(log.safeParse({ body, summary: 'AI rewrite' }).success).toBe(false);
  });
  it('accepts actual privacy enums, rejects invented enums and invalid calendar days', () => {
    expect(marker.safeParse({ privacyLevel: 'HIGH_PRIVATE' }).success).toBe(
      true,
    );
    expect(marker.safeParse({ privacyLevel: 'HIGH' }).success).toBe(false);
    expect(querySchema.safeParse({ day: '2026-02-31' }).success).toBe(false);
    expect(querySchema.safeParse({ ownerId: 'foreign' }).success).toBe(false);
  });
  it('Lim has strict minimal actions, no P0 escalation or captain overwrite', () => {
    const base = { confidence: 'HIGH' };
    expect(() =>
      parseAction({
        ...base,
        type: 'CREATE_REMINDER',
        payload: {
          title: '拿快递',
          scheduledAt: '2030-10-17T08:00:00Z',
          priority: 'P0',
        },
      }),
    ).toThrow();
    expect(() =>
      parseAction({
        ...base,
        type: 'UPDATE_CAPTAIN_LOG',
        payload: { id, body: 'rewrite' },
      }),
    ).toThrow();
    expect(() =>
      parseAction({
        ...base,
        type: 'REMEMBER_MOMENT',
        payload: { sourceId: id, privacyLevel: 'NORMAL' },
      }),
    ).toThrow();
  });
  it('requires the exact full authored paragraph and explicit archive instruction', () => {
    const body = '  原文\r\nLIFE HUD  ';
    const pack: ContextPack = {
      asOf: '2030-10-17T07:00:00Z',
      timeZone: 'Asia/Shanghai',
      mode: 'EXECUTE',
      domains: ['UI'],
      current: null,
      candidates: [],
      userHistory: [body, '把刚才这段存成 Captain’s Log。'],
    };
    expect(
      canCreateLog(body, pack.userHistory, '把刚才这段存成 Captain’s Log。'),
    ).toBe(true);
    expect(
      canCreateLog(
        'LIFE HUD',
        pack.userHistory,
        '把刚才这段存成 Captain’s Log。',
      ),
    ).toBe(false);
    expect(canCreateLog(body, pack.userHistory, '随便聊聊')).toBe(false);
  });
});
