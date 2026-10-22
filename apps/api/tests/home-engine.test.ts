import { describe, it, expect } from 'vitest';
import { attentionEngine } from '../src/resources/home/engine';
import { attentionReply } from '../src/resources/home/lim-recommendation';
import { selectClockNow } from '../src/resources/core-clock';
import type {
  HomeContext,
  WorkCandidate,
  ClassCandidate,
} from '../src/resources/home/types';
const at = (clock: string, day = '2026-10-16') =>
  new Date(day + 'T' + clock + ':00+08:00');
const uuid = (n: number) =>
  '00000000-0000-4000-8000-' + String(n).padStart(12, '0');
const work = (
  n: number,
  patch: Partial<WorkCandidate> = {},
): WorkCandidate => ({
  type: 'TASK',
  title:
    ['', '拿快递', '高数第三章作业', '英语阅读', '整理 LIFE HUD 架构'][n] ??
    '测试任务',
  reason: '',
  sourceRef: { type: 'TASK', id: uuid(n), version: 1 },
  state: 'INBOX',
  suggestedAction: 'OPEN_TASK',
  plannedStart: null,
  dueAt: null,
  endsAt: null,
  estimatedMinutes: 20,
  courseId: null,
  projectTitle: null,
  importance: 'NORMAL',
  ...patch,
});
const lesson = (
  n: number,
  title: string,
  start: string,
  end: string,
): ClassCandidate => ({
  type: 'CLASS',
  title,
  reason: '',
  sourceRef: { type: 'CLASS_SESSION', id: uuid(n), version: 1 },
  state: 'UPCOMING',
  suggestedAction: 'OPEN_COURSE',
  plannedStart: at(start).toISOString(),
  endsAt: at(end).toISOString(),
  dueAt: null,
  estimatedMinutes: null,
  courseId: uuid(90 + n),
  projectTitle: null,
});
const standard = (): HomeContext => ({
  work: [
    work(1, {
      state: 'PLANNED',
      plannedStart: at('16:00').toISOString(),
      estimatedMinutes: 10,
    }),
    work(2, {
      state: 'PLANNED',
      plannedStart: at('20:00').toISOString(),
      dueAt: at('23:59').toISOString(),
      estimatedMinutes: 35,
      importance: 'HIGH',
    }),
    work(3),
    work(4, { estimatedMinutes: 90, importance: 'HIGH' }),
  ],
  classes: [
    lesson(10, '高等数学', '09:50', '11:25'),
    lesson(11, '计算机思维与人工智能基础', '14:00', '15:35'),
  ],
  status: null,
  voyage: null,
  alerts: [],
});
const run = (context: HomeContext, clock: string, day?: string) =>
  attentionEngine(context, at(clock, day), 'Asia/Shanghai');
describe('deterministic HOME attention', () => {
  it('HOME-003/004: class now and upcoming class beat incompatible long work', () => {
    const c = standard();
    expect(run(c, '09:10').nextAction?.title).toBe('高等数学');
    expect(run(c, '14:20').nextAction?.title).toBe('计算机思维与人工智能基础');
    expect(run(c, '14:20').currentContext?.state).toBe('CURRENT');
  });
  it('HOME-005/006/007: planned short work then real deadline, recalculated after completion', () => {
    const c = standard();
    expect(run(c, '16:10').nextAction?.title).toBe('拿快递');
    c.work[0].state = 'COMPLETED';
    expect(run(c, '16:10').nextAction?.title).toBe('高数第三章作业');
    const evening = run(c, '20:30');
    expect(evening.nextAction?.reason).toBe('今晚截止，预计35分钟。');
    expect(evening.fallbackAction?.title).toBe('英语阅读');
  });
  it('HOME-008: low energy is soft, never hides a hard deadline or explicit active work', () => {
    const c = standard();
    c.classes = [];
    c.work = c.work.slice(2);
    c.status = {
      id: uuid(50),
      recordedAt: at('13:10').toISOString(),
      mood: 'TIRED',
      customMood: null,
      energy: 1,
      stress: null,
      focus: null,
    };
    expect(run(c, '16:10').nextAction?.title).toBe('英语阅读');
    c.work[1].state = 'ACTIVE';
    expect(run(c, '16:10').nextAction?.title).toBe('整理 LIFE HUD 架构');
    c.work.push(
      work(5, { dueAt: at('16:40').toISOString(), estimatedMinutes: 90 }),
    );
    expect(run(c, '16:10').nextAction?.sourceRef.id).toBe(uuid(5));
  });
  it('HOME-009/010/011: empty and late-night quiet states still show true deadlines', () => {
    const c = standard();
    c.classes = [];
    c.work = c.work.slice(2);
    expect(run(c, '00:40', '2026-10-17').nextAction).toBeNull();
    expect(run(c, '00:40', '2026-10-17').emptyMessage).toBe(
      '今晚没有必须处理的事。',
    );
    c.work.push(work(5, { dueAt: at('01:00', '2026-10-17').toISOString() }));
    expect(run(c, '00:40', '2026-10-17').nextAction?.sourceRef.id).toBe(
      uuid(5),
    );
    expect(run({ ...c, work: [] }, '12:00').emptyMessage).toBe(
      '此刻，可以留白。',
    );
  });
  it('HOME-014/015/016: immutable inputs, one alternative and no scores in public DTO', () => {
    const c = standard(),
      before = JSON.stringify(c);
    const result = run(c, '20:30');
    expect(JSON.stringify(c)).toBe(before);
    expect(result.todayItems.length).toBeLessThanOrEqual(6);
    expect(result.fallbackAction).not.toBeInstanceOf(Array);
    expect(JSON.stringify(result)).not.toMatch(
      /score|coefficient|importance|urgency|priority/i,
    );
    expect(attentionReply(result)).toContain(result.nextAction!.title);
  });
  it('HOME-017: development clock is explicit and production ignores it', () => {
    const real = at('12:00');
    expect(
      selectClockNow(
        { APP_ENV: 'production', DEV_NOW: at('09:10').toISOString() },
        real,
      ),
    ).toBe(real);
    for (const clock of ['09:10', '14:20', '16:10', '20:30', '00:40'])
      expect(
        selectClockNow(
          { APP_ENV: 'development', DEV_NOW: at(clock).toISOString() },
          real,
        ),
      ).toEqual(at(clock));
  });
  it('preserves hard reality during class and respects exact class boundaries', () => {
    const c = standard();
    c.work.push(work(5, { dueAt: at('14:30').toISOString() }));
    expect(run(c, '14:20').nextAction?.type).toBe('CLASS');
    expect(run(c, '14:20').alerts[0]?.code).toBe('DEADLINE_DURING_CLASS');
    expect(run(c, '15:35').currentContext?.state).not.toBe('CURRENT');
    c.work = [work(5, { dueAt: at('09:30').toISOString(), estimatedMinutes: 90 })];
    expect(run(c, '09:10').nextAction?.state).toBe('UPCOMING');
    expect(run(c, '09:10').alerts[0]?.sourceRef.id).toBe(uuid(5));
    expect(run(c, '09:50').alerts[0]?.title).toContain('截止时间已过');
  });
});
