import { describe, it, expect } from 'vitest';
import { buildBoard } from '../src/resources/tasks/methods/recommend';
import type { Task } from '../src/db';
import { selectClockNow } from '../src/resources/core-clock';

const NOW = new Date('2026-10-16T04:00:00Z'); // 12:00 local in Asia/Shanghai (+08:00)
const ZONE = 'Asia/Shanghai';

let seq = 0;
const task = (over: Partial<Task> = {}): Task => {
  const id = over.id ?? `t${++seq}`;
  const ts = new Date('2026-10-01T00:00:00Z');
  return {
    id,
    ownerId: 'u1',
    version: 1,
    createdAt: ts,
    updatedAt: ts,
    deletedAt: null,
    title: '英语阅读',
    description: null,
    status: 'INBOX',
    importance: 'NORMAL',
    plannedStart: null,
    plannedEnd: null,
    dueAt: null,
    estimatedMinutes: 30,
    actualMinutes: null,
    projectId: null,
    sourceType: null,
    sourceId: null,
    completedAt: null,
    ...over,
  };
};

const ids = (now: { task: Task; reason: string }[]) =>
  now.map((n) => n.task.id);

// All dates below are UTC; local day in Asia/Shanghai = UTC+8.
describe('buildBoard', () => {
  it('development clock deterministically crosses the 24-hour deadline boundary', () => {
    const t = task({
      id: 'clock-deadline',
      status: 'PLANNED',
      dueAt: new Date('2026-10-17T02:00:00Z'),
    });
    const before = selectClockNow({
      APP_ENV: 'development',
      DEV_NOW: '2026-10-16T01:59:00Z',
    });
    const near = selectClockNow({
      APP_ENV: 'development',
      DEV_NOW: '2026-10-16T02:01:00Z',
    });
    expect(buildBoard([t], before, ZONE).now).toEqual([]);
    expect(ids(buildBoard([t], near, ZONE).now)).toEqual(['clock-deadline']);
  });
  it('returns an empty board for quiet (no task) input', () => {
    expect(buildBoard([], NOW, ZONE)).toEqual({
      now: [],
      today: [],
      inbox: [],
    });
  });

  it('keeps future-planned tasks without urgent deadlines out of NOW and TODAY', () => {
    const future = task({
      id: 'future',
      status: 'PLANNED',
      plannedStart: new Date('2026-10-17T02:00:00Z'), // 10-17 10:00 local
      plannedEnd: new Date('2026-10-17T03:00:00Z'),
    });
    const board = buildBoard([future], NOW, ZONE);
    expect(board.now).toEqual([]);
    expect(board.today).toEqual([]);
    expect(board.inbox).toEqual([]);
  });

  it('ranks ACTIVE first, then 24h-deadline, then HIGH unplanned INBOX', () => {
    const active = task({ id: 'active', status: 'ACTIVE' });
    const dueSoon = task({
      id: 'due',
      dueAt: new Date('2026-10-16T12:00:00Z'),
    }); // 20:00 local, 8h out
    const highInbox = task({ id: 'high', importance: 'HIGH' });
    const board = buildBoard([highInbox, dueSoon, active], NOW, ZONE);
    expect(ids(board.now)).toEqual(['active', 'due', 'high']);
    expect(board.now[0].reason.length).toBeGreaterThan(0);
  });

  it('applies duration fit only within the same importance tier', () => {
    const dueAt = new Date('2026-10-16T12:00:00Z');
    const low = task({
      id: 'low-fit',
      importance: 'LOW',
      estimatedMinutes: 5,
      dueAt,
    });
    const highNoFit = task({
      id: 'high-nofit',
      importance: 'HIGH',
      estimatedMinutes: 90,
      dueAt,
    });
    const highFit = task({
      id: 'high-fit',
      importance: 'HIGH',
      estimatedMinutes: 20,
      dueAt,
    });
    const board = buildBoard([low, highNoFit, highFit], NOW, ZONE, 30);
    expect(ids(board.now)).toEqual(['high-fit', 'high-nofit', 'low-fit']);
  });

  it('uses the Asia/Shanghai local day for TODAY and overdue NOW membership', () => {
    const earlyToday = task({
      id: 'early',
      dueAt: new Date('2026-10-15T18:00:00Z'),
    }); // 10-16 02:00 local, overdue
    const nextLocalDay = task({
      id: 'next',
      dueAt: new Date('2026-10-16T16:30:00Z'),
    }); // 10-17 00:30 local
    const board = buildBoard([earlyToday, nextLocalDay], NOW, ZONE);
    expect(board.today.map((t) => t.id)).toEqual(['early']);
    expect(ids(board.now)).toEqual(['early', 'next']);
  });

  it('excludes soft-deleted and terminal tasks from every bucket', () => {
    const board = buildBoard(
      [
        task({ id: 'del', deletedAt: new Date('2026-10-15T00:00:00Z') }),
        task({
          id: 'done',
          status: 'COMPLETED',
          completedAt: new Date('2026-10-15T00:00:00Z'),
        }),
        task({ id: 'drop', status: 'DROPPED' }),
        task({ id: 'live' }),
      ],
      NOW,
      ZONE,
    );
    expect(board.now).toEqual([]);
    expect(board.today).toEqual([]);
    expect(board.inbox.map((t) => t.id)).toEqual(['live']);
  });

  it('breaks full ordering ties deterministically by id across repeated calls', () => {
    const a = task({ id: 'tie-a', importance: 'HIGH' });
    const b = task({ id: 'tie-b', importance: 'HIGH' });
    const first = buildBoard([b, a], NOW, ZONE);
    const second = buildBoard([b, a], NOW, ZONE);
    expect(ids(first.now)).toEqual(['tie-a', 'tie-b']);
    expect(ids(second.now)).toEqual(ids(first.now));
  });

  it('never mutates input: frozen/rotated input yields the identical board', () => {
    const tasks = [
      task({
        id: 'm1',
        importance: 'HIGH',
        dueAt: new Date('2026-10-16T12:00:00Z'),
      }),
      task({
        id: 'm2',
        status: 'ACTIVE',
        plannedStart: new Date('2026-10-16T00:00:00Z'),
      }),
      task({ id: 'm3' }),
    ];
    const snapshot = JSON.stringify(tasks);
    const frozen = Object.freeze(tasks.map((t) => Object.freeze({ ...t })));
    const board = buildBoard(frozen, NOW, ZONE);
    expect(JSON.stringify(tasks)).toBe(snapshot);
    const rotated = buildBoard(Object.freeze([...frozen].reverse()), NOW, ZONE);
    expect(ids(rotated.now)).toEqual(ids(board.now));
    expect(rotated.today.map((t) => t.id)).toEqual(
      board.today.map((t) => t.id),
    );
  });
});
