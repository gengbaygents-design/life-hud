import { describe, expect, it } from 'vitest';
import { actionSchema, proposalSchema, actionRisk } from './actions';
import { detectMode, invalidClock, selectDomains } from './intent';
import { canUseAi } from './privacy';
describe('Lim contracts and authority prerequisites', () => {
  it('rejects unknown actions and arbitrary owner/SQL writes', () => {
    for (const value of [
      { type: 'DROP_TASK', confidence: 'HIGH', payload: {} },
      {
        type: 'CREATE_TASK',
        confidence: 'HIGH',
        payload: { title: 'x', ownerId: 'foreign' },
      },
      {
        type: 'UPDATE_TASK',
        confidence: 'HIGH',
        payload: { taskId: crypto.randomUUID(), sql: 'delete' },
      },
    ])
      expect(actionSchema.safeParse(value).success).toBe(false);
  });
  it('rejects invalid time and impossible status values', () => {
    expect(
      actionSchema.safeParse({
        type: 'RECORD_STATUS',
        confidence: 'HIGH',
        payload: { energy: 6 },
      }).success,
    ).toBe(false);
    expect(
      actionSchema.safeParse({
        type: 'DELAY_TASK',
        confidence: 'HIGH',
        payload: {
          taskId: crypto.randomUUID(),
          newPlannedStart: '2026-10-16T25:00:00+08:00',
        },
      }).success,
    ).toBe(false);
    expect(invalidClock('二十五点提醒我拿快递')).toBe(true);
  });
  it('keeps complaints and casual fatigue out of execution', () => {
    expect(detectMode('我真不想写高数了。')).toBe('TALK');
    expect(detectMode('我现在有点累。')).toBe('TALK');
    expect(detectMode('记一下，我有点累，精力2。')).toBe('EXECUTE');
    expect(detectMode('高数今天不做了，挪到明天下午。')).toBe('EXECUTE');
  });
  it('recognizes implicit scheduling and keeps thought recording in Growth', () => {
    expect(detectMode('第三章作业今晚九点做。')).toBe('EXECUTE');
    expect(
      selectDomains('把刚才过拟合那个想法记下来。', 'EXECUTE', 'COURSE'),
    ).toEqual(['UI', 'VOYAGE', 'GROWTH', 'STUDY']);
  });
  it('never grants HIGH_PRIVATE, VAULT or NEVER regardless of request', () => {
    for (const privacyLevel of ['NORMAL', 'PRIVATE', 'HIGH_PRIVATE', 'VAULT'])
      for (const explicit of [true, false])
        expect(
          canUseAi({ privacyLevel, aiPolicy: 'NEVER' }, explicit, true),
        ).toBe(false);
    for (const privacyLevel of ['HIGH_PRIVATE', 'VAULT'])
      for (const aiPolicy of ['ALWAYS', 'WHEN_RELEVANT', 'EXPLICIT_ONLY'])
        expect(canUseAi({ privacyLevel, aiPolicy }, true, true)).toBe(false);
  });
  it('requires explicit permission for existing private records', () => {
    expect(
      canUseAi(
        { privacyLevel: 'PRIVATE', aiPolicy: 'EXPLICIT_ONLY' },
        false,
        true,
      ),
    ).toBe(false);
    expect(
      canUseAi(
        { privacyLevel: 'PRIVATE', aiPolicy: 'EXPLICIT_ONLY' },
        true,
        true,
      ),
    ).toBe(true);
    expect(
      canUseAi(
        { privacyLevel: 'PRIVATE', aiPolicy: 'WHEN_RELEVANT' },
        false,
        false,
      ),
    ).toBe(false);
  });
  it('bounds action groups and distinguishes risk', () => {
    const read = {
      type: 'QUERY_CURRENT_CONTEXT',
      confidence: 'HIGH',
      payload: {},
    };
    expect(
      proposalSchema.safeParse({
        mode: 'ASSIST',
        reply: '',
        clarification: null,
        actions: Array(5).fill(read),
      }).success,
    ).toBe(false);
    expect(actionRisk('QUERY_TIMETABLE')).toBe('R0');
    expect(actionRisk('CREATE_TASK')).toBe('R1');
  });
});
