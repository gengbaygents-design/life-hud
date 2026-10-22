import { it, expect } from 'vitest';
import { inputSchema, recordSchema } from '../src/resources/home/contract';
import { isAttentionQuestion } from '../src/resources/home/lim-recommendation';

// Canonical quiet view: the exact empty state the home screen renders.
const emptyHomeView = {
  upcomingReminder:null,
  asOf: '2026-10-16T06:30:00.000Z',
  timeZone: 'Asia/Shanghai',
  currentContext: null,
  nextAction: null,
  fallbackAction: null,
  upcomingClass: null,
  todayItems: [],
  statusSnapshot: null,
  voyageSnapshot: null,
  alerts: [],
  emptyMessage: '此刻，可以留白。',
  nextRefreshAt: '2026-10-16T06:30:30.000Z',
} as const;

const validInput = {
  timeZone: 'Asia/Shanghai',
};

it('never accepts an HTTP owner identity override', () => {
  const result = inputSchema.safeParse({
    ...validInput,
    ownerId: 'unknown-owner',
  });
  expect(result.success).toBe(false);
});

it('rejects even valid timestamps as HTTP clock controls', () => {
  expect(
    inputSchema.safeParse({ ...validInput, now: '2026-10-16T06:30:00.000Z' })
      .success,
  ).toBe(false);
  expect(inputSchema.safeParse(validInput).success).toBe(true);
});

it('rejects an invalid timeZone but accepts Asia/Shanghai', () => {
  expect(
    inputSchema.safeParse({ ...validInput, timeZone: 'Mars/Olympus' }).success,
  ).toBe(false);
  expect(inputSchema.safeParse(validInput).success).toBe(true);
});

it('rejects an arbitrary score leaked onto the view contract', () => {
  expect(recordSchema.safeParse({ ...emptyHomeView, score: 0.9 }).success).toBe(
    false,
  );
});

it('rejects fallbackAction presented as an array', () => {
  expect(
    recordSchema.safeParse({ ...emptyHomeView, fallbackAction: [] }).success,
  ).toBe(false);
});

it('accepts the quiet empty state exactly, with no injected defaults', () => {
  expect(recordSchema.parse(emptyHomeView)).toEqual(emptyHomeView);
});

it('flags only the local attention question', () => {
  expect(isAttentionQuestion('我现在干嘛？')).toBe(true);
  expect(isAttentionQuestion('我真不想写高数了')).toBe(false);
  expect(isAttentionQuestion('记一下我有点累')).toBe(false);
});
