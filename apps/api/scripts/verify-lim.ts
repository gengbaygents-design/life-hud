import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import { databaseClient, rawDb } from '../src/db';
import { inDomainTransaction } from '../src/resources/core-methods';
import { seedUniversity } from './seed-university';
import {
  createConversation,
  sendTurn,
  getConversation,
  getTurn,
  getTrace,
} from '../src/resources/lim/methods';
import { mockProposal } from '../src/resources/lim/mock-provider';
import { undoGroup } from '../src/resources/lim/executor';
import { buildContext } from '../src/resources/lim/context';
import { turnInputSchema } from '../src/resources/lim/contract';
import * as tasks from '../src/resources/tasks/methods';
import * as assignments from '../src/resources/assignments/methods';
import * as status from '../src/resources/status-moments/methods';
import * as learning from '../src/resources/learning-records/methods';
import * as cycles from '../src/resources/cycle-records/methods';
import { dispatchPendingEvents } from '../src/resources/outbox-events/methods';
import { handleTaskCompleted } from '../src/resources/assignments/handlers/task-completed';
import { isAiConfigured } from '@ship/ai';
import { runtimeModel } from '../src/resources/lim/provider';
import { providerStatus } from '../src/resources/lim/provider';
import type { LimModel } from '../src/resources/lim/provider';
import type { ContextPack, SourceRef } from '../src/resources/lim/types';
const identities: { id: string; email: string; cookie: string }[] = [];
const mock: LimModel = { propose: mockProposal };
const proposal = (type: string, payload: unknown, confidence = 'HIGH') => ({
  mode: 'EXECUTE',
  reply: '',
  clarification: null,
  actions: [{ type, confidence, payload }],
});
const fixed = (value: unknown): LimModel => ({
  async propose() {
    return value;
  },
});
const api = process.env.API_URL!,
  origin = process.env.WEB_URL!;
if (process.env.APP_ENV !== 'development')
  throw new Error('Development acceptance only');
process.env.DEV_NOW = '2026-10-16T06:30:00Z';
let phase = 'startup';
const pass = (label: string) => console.log('PASS ' + label);
async function http(
  path: string,
  a?: (typeof identities)[number],
  body?: unknown,
  method = body ? 'POST' : 'GET',
  retry = false,
): Promise<Response> {
  const r = await fetch(api + path, {
    method,
    headers: {
      Origin: origin,
      'Content-Type': 'application/json',
      ...(a ? { Cookie: a.cookie } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });
  if (r.status === 429 && !retry) {
    const seconds = Number(
      r.headers.get('retry-after') || r.headers.get('x-retry-after'),
    );
    if (seconds > 0 && seconds <= 10) {
      await r.body?.cancel();
      await new Promise((r) => setTimeout(r, seconds * 1000 + 250));
      return http(path, a, body, method, true);
    }
  }
  return r;
}
try {
  for (const suffix of ['a', 'b']) {
    const email =
      'lim-verification-' + randomUUID() + suffix + '@local.invalid';
    const r = await http('/api/auth/sign-up/email', undefined, {
      email,
      name: 'Lim verification',
      password: randomBytes(24).toString('base64url'),
    });
    assert.equal(r.status, 200);
    const data = (await r.json()) as { user: { id: string } };
    identities.push({
      id: data.user.id,
      email,
      cookie: r.headers
        .getSetCookie()
        .map((v) => v.split(';')[0])
        .join('; '),
    });
  }
  const [a, b] = identities,
    fixture = await seedUniversity(a.id, '2026-10-16'),
    foreign = await seedUniversity(b.id, '2026-10-16');
  const chat = await createConversation(a.id),
    source: SourceRef = { type: 'COURSE', id: fixture.courseIds.math };
  const input = (content: string, sourceEntity: SourceRef | null = source) => ({
    conversationId: chat.id,
    requestId: randomUUID(),
    content,
    sourceRoute: '/app/study/' + fixture.courseIds.math,
    sourceEntity,
    shareRefs: [],
  });
  const turn = (
    content: string,
    model: LimModel = mock,
    sourceEntity: SourceRef | null = source,
  ) => sendTurn(a.id, input(content, sourceEntity), model);
  const taskCount = async () =>
    Number(
      (
        await databaseClient`select count(*) as n from tasks where owner_id=${a.id} and deleted_at is null`
      )[0].n,
    );
  phase = 'LIM-001';
  const create = await turn('创建一个拿快递任务。',fixed(proposal('CREATE_TASK',{title:'拿快递',plannedStart:'2026-10-16T16:00:00+08:00'})));
  assert.equal(create.status, 'SUCCESS');
  assert.equal(create.result?.createdEntities[0].type, 'TASK');
  pass(phase + ' CREATE_TASK through domain transaction');
  const initial = await taskCount();
  phase = 'LIM-002';
  assert.equal(
    (
      await turn(
        '创建任务',
        fixed(proposal('CREATE_TASK', { title: 'invalid', ownerId: b.id })),
      )
    ).status,
    'FAILED',
  );
  assert.equal(await taskCount(), initial);
  pass(phase + ' strict payload before mutation');
  const beforeForeign = await assignments.getRecord(b.id, {
    id: foreign.assignmentId,
  });
  phase = 'LIM-003';
  const foreignResult = await turn(
    '老师说截止改到周一。',
    fixed(
      proposal('UPDATE_ASSIGNMENT_DUE_DATE', {
        assignmentId: foreign.assignmentId,
        newDueAt: '2026-10-19T18:00:00+08:00',
        expectedVersion: 1,
      }),
    ),
  );
  assert.equal(foreignResult.status, 'FAILED');
  assert.deepEqual(
    await assignments.getRecord(b.id, { id: foreign.assignmentId }),
    beforeForeign,
  );
  pass(phase + ' foreign target cannot mutate');
  phase = 'LIM-004';
  assert.equal(
    (await turn('创建任务', fixed(proposal('RUN_SQL', { sql: 'delete' }))))
      .status,
    'FAILED',
  );
  pass(phase + ' unknown action rejected');
  let academic = await assignments.getRecord(a.id, {
    id: fixture.assignmentId,
  });
  const taskId = academic.taskId!;
  phase = 'LIM-005';
  assert.equal(
    (
      await turn(
        '我真不想写高数了。',
        fixed(proposal('COMPLETE_TASK', { taskId, expectedVersion: 1 })),
      )
    ).status,
    'FAILED',
  );
  assert.equal((await tasks.getTask(a.id, { id: taskId })).status, 'PLANNED');
  pass(phase + ' complaint cannot be elevated by model');
  phase = 'LIM-006/007';
  const due = academic.dueAt;
  const delay = await turn('高数今天不做了，挪到明天下午。');
  assert.equal(delay.status, 'SUCCESS');
  let task = await tasks.getTask(a.id, { id: taskId });
  assert.equal(task.plannedStart, '2026-10-17T07:00:00.000Z');
  assert.equal(task.dueAt, due);
  assert.equal(
    (await assignments.getRecord(a.id, { id: academic.id })).dueAt,
    due,
  );
  pass(phase + ' delay preserves deadline');
  phase = 'LIM-022';
  await undoGroup(a.id, delay.id, delay.result!.undoToken!);
  assert.equal((await tasks.getTask(a.id, { id: taskId })).plannedStart, null);
  await assert.rejects(undoGroup(b.id, delay.id, delay.result!.undoToken!));
  pass(phase + ' safe owner-scoped undo');
  phase = 'LIM-008/009';
  const completed = await turn('高数第三章作业我做完了。');
  assert.equal(completed.status, 'SUCCESS');
  assert.ok(!completed.reply.includes('已经提交'));
  assert.equal((await tasks.getTask(a.id, { id: taskId })).status, 'COMPLETED');
  await dispatchPendingEvents(
    new Map([['TaskCompleted', handleTaskCompleted]]),
    100,
  );
  academic = await assignments.getRecord(a.id, { id: academic.id });
  assert.equal(academic.workState, 'DONE');
  assert.equal(academic.submissionState, 'NOT_SUBMITTED');
  pass(phase + ' completion outbox sets DONE not SUBMITTED');
  phase = 'LIM-010';
  assert.equal(
    (await turn('我交了。', mock, { type: 'ASSIGNMENT', id: academic.id }))
      .status,
    'SUCCESS',
  );
  assert.equal(
    (await assignments.getRecord(a.id, { id: academic.id })).submissionState,
    'SUBMITTED',
  );
  pass(phase + ' explicit submission in current context');
  phase = 'LIM-011';
  const unclearChat = await createConversation(a.id);
  await assignments.createRecord(a.id, {
    courseId: fixture.courseIds.math,
    title: '另一份作业',
  });
  await assignments.createRecord(a.id, {
    courseId: fixture.courseIds.math,
    title: '另一份作业二',
  });
  const unclear = await sendTurn(
    a.id,
    {
      ...input('我交了。', null),
      conversationId: unclearChat.id,
      sourceRoute: '/app',
    },
    mock,
  );
  assert.equal(unclear.status, 'CLARIFICATION');
  pass(phase + ' ambiguous submission asks one question');
  phase = 'LIM-012';
  const planBefore = (await tasks.getTask(a.id, { id: taskId })).plannedStart;
  const changeDue = await turn('老师说高数第三章改到周一交。', mock, {
    type: 'ASSIGNMENT',
    id: academic.id,
  });
  assert.equal(changeDue.status, 'SUCCESS');
  task = await tasks.getTask(a.id, { id: taskId });
  academic = await assignments.getRecord(a.id, { id: academic.id });
  assert.equal(task.dueAt, academic.dueAt);
  assert.equal(task.plannedStart, planBefore);
  pass(phase + ' University deadline synchronization reused');
  phase = 'LIM-013';
  const partialStatus = await turn(
    '记一下，精力2。',
    fixed(proposal('RECORD_STATUS', { energy: 2 })),
  );
  assert.equal(partialStatus.status, 'SUCCESS');
  pass(phase + ' partial status');
  phase = 'LIM-014';
  const statusCount = (await status.listRecords(a.id)).length;
  const casual = await turn(
    '我现在有点累。',
    fixed(proposal('RECORD_STATUS', { energy: 2 })),
  );
  assert.equal(casual.status, 'FAILED');
  assert.equal((await status.listRecords(a.id)).length, statusCount);
  pass(phase + ' casual fatigue cannot write');
  phase = 'LIM-015';
  assert.equal((await turn('记一下，我有点累，精力2。')).status, 'SUCCESS');
  assert.equal((await status.listRecords(a.id)).length, statusCount + 1);
  pass(phase + ' explicit capture');
  phase = 'LIM-016';
  const sourceOnly = await turn(
    '记录这个来源 https://example.org/notes',
    fixed(
      proposal('CREATE_LEARNING_RECORD', {
        title: '来源',
        sourceKind: 'URL',
        sourceRef: 'https://example.org/notes',
      }),
    ),
  );
  assert.equal(sourceOnly.status, 'SUCCESS');
  assert.equal(
    (
      await learning.getRecord(a.id, {
        id: sourceOnly.result!.createdEntities[0].id,
      })
    ).reflection,
    null,
  );
  pass(phase + ' source-only learning without reflection');
  phase = 'LIM-017';
  const count = (await learning.listRecords(a.id)).length;
  assert.equal(
    (
      await turn(
        '把刚才过拟合的想法记下来。',
        fixed(
          proposal('CREATE_LEARNING_RECORD', {
            title: '过拟合',
            reflection: 'I understand every concept now',
          }),
        ),
      )
    ).status,
    'FAILED',
  );
  assert.equal((await learning.listRecords(a.id)).length, count);
  pass(phase + ' invented reflection rejected');
  phase = 'LIM-018';
  const never = await learning.createRecord(a.id, {
    title: 'NEVER_SENTINEL',
    reflection: 'NEVER_SECRET',
    privacyLevel: 'HIGH_PRIVATE',
  });
  await databaseClient`update learning_records set ai_policy='NEVER' where id=${never.id}`;
  await cycles.createRecord(a.id, {
    startDate: '2026-10-16',
    note: 'CYCLE_SECRET',
  });
  let captured: ContextPack | undefined;
  const spy: LimModel = {
    async propose(_text, pack) {
      captured = pack;
      return {
        mode: 'ASSIST',
        reply: '先看看。',
        clarification: null,
        actions: [],
      };
    },
  };
  const neverNormal=await learning.createRecord(a.id,{title:'NEVER_NORMAL_SENTINEL',privacyLevel:'NORMAL'}),highAlways=await learning.createRecord(a.id,{title:'HIGH_ALWAYS_SENTINEL',privacyLevel:'HIGH_PRIVATE'});
  await databaseClient`update learning_records set ai_policy='NEVER' where id=${neverNormal.id}`;
  await databaseClient`update learning_records set ai_policy='ALWAYS' where id=${highAlways.id}`;
  await sendTurn(
    a.id,
    {
      ...input('帮我看看学习上下文？', { type: 'LEARNING_RECORD', id: never.id }),
      shareRefs: [{ type: 'LEARNING_RECORD', id: never.id },{type:'LEARNING_RECORD',id:neverNormal.id},{type:'LEARNING_RECORD',id:highAlways.id}],
    },
    spy,
  );
  assert.ok(captured);
  assert.ok(!JSON.stringify(captured).includes('NEVER_SENTINEL'));
  assert.ok(!JSON.stringify(captured).includes('NEVER_SECRET'));
  assert.ok(!JSON.stringify(captured).includes('NEVER_NORMAL_SENTINEL'));
  assert.ok(!JSON.stringify(captured).includes('HIGH_ALWAYS_SENTINEL'));
  assert.ok(!JSON.stringify(captured).includes('CYCLE_SECRET'));
  assert.ok(!captured.candidates.some((c) => c.type === 'CYCLE_RECORD'));
  pass(phase + ' NEVER/HIGH_PRIVATE/Cycle excluded before model');
  const permitted = await learning.createRecord(a.id, {
    title: 'EXPLICIT_SENTINEL',
    reflection: 'USER_AUTHORED',
  });
  const without = await buildContext(
    a.id,
    turnInputSchema.parse(
      input('把学习记录想法记下来。', {
        type: 'LEARNING_RECORD',
        id: permitted.id,
      }),
    ),
    [],
  );
  assert.ok(!without.candidates.some((c) => c.id === permitted.id));
  const withGrant = await buildContext(
    a.id,
    turnInputSchema.parse({
      ...input('把学习记录想法记下来。', {
        type: 'LEARNING_RECORD',
        id: permitted.id,
      }),
      shareRefs: [{ type: 'LEARNING_RECORD', id: permitted.id }],
    }),
    [],
  );
  assert.ok(withGrant.candidates.some((c) => c.id === permitted.id));
  pass('EXPLICIT_ONLY permission is separate from ownership/UI selection');
  phase = 'LIM-019';
  captured = undefined;
  await turn('这门课最近有什么没处理？', spy);
  assert.equal(captured?.current?.id, fixture.courseIds.math);
  assert.ok(
    captured?.candidates.some(
      (c) => c.type === 'COURSE' && c.id === fixture.courseIds.math,
    ),
  );
  pass(phase + ' current course used');
  phase = 'LIM-020';
  const partial = await turn(
    '创建任务，再安排任务。',
    fixed({
      mode: 'EXECUTE',
      reply: '都搞定了。',
      clarification: null,
      actions: [
        {
          type: 'CREATE_TASK',
          confidence: 'HIGH',
          payload: { title: 'partial-success' },
        },
        {
          type: 'DELAY_TASK',
          confidence: 'HIGH',
          payload: {
            taskId: randomUUID(),
            newPlannedStart: '2026-10-17T07:00:00Z',
          },
        },
      ],
    }),
  );
  assert.equal(partial.status, 'PARTIAL');
  assert.equal(partial.result?.createdEntities.length, 1);
  assert.ok(partial.reply.includes('未完成'));
  assert.ok(!partial.reply.includes('都搞定'));
  pass(phase + ' truthful partial failure');
  phase = 'LIM-021';
  const retryInput = input('创建任务幂等。');
  const idempotentModel = fixed(
    proposal('CREATE_TASK', { title: 'idempotent-once' }),
  );
  const [first, second] = await Promise.all([
    sendTurn(a.id, retryInput, idempotentModel),
    sendTurn(a.id, retryInput, idempotentModel),
  ]);
  assert.equal(first.id, second.id);
  const third = await sendTurn(a.id, retryInput, idempotentModel);
  assert.equal(third.status, 'SUCCESS');
  assert.equal(
    Number(
      (
        await databaseClient`select count(*) as n from tasks where owner_id=${a.id} and title='idempotent-once'`
      )[0].n,
    ),
    1,
  );
  pass(phase + ' concurrent retry executes group once');
  phase = 'LIM-023';
  const outage: LimModel = {
    async propose() {
      throw new Error('sensitive provider failure detail');
    },
  };
  assert.equal((await turn('今天还有什么要紧的？', outage)).status, 'FAILED');
  for (const route of [
    '/tasks/board',
    '/study',
    '/status',
    '/growth',
    '/health/ready',
  ])
    assert.equal((await http(route, a)).status, 200);
  pass(phase + ' provider outage leaves real modules usable');
  phase = 'multi-action reconciliation';
  const multi = await turn('老师说下一次作业周五交，我周四晚上写。');
  assert.equal(multi.status, 'SUCCESS');
  const multiA = (await assignments.listRecords(a.id)).find(
    (v) => v.title === '下一次作业',
  )!;
  assert.ok(multiA.taskId);
  assert.equal(
    (await tasks.getTask(a.id, { id: multiA.taskId })).plannedStart,
    '2026-10-22T12:00:00.000Z',
  );
  const n = await taskCount();
  await turn('老师说下一次作业周五交，我周四晚上写。');
  assert.equal(await taskCount(), n);
  pass(phase + ' linked task planning and duplicate reconciliation');
  phase = 'task edit undo and conflict';
  const t = await tasks.createTask(a.id, { title: 'safe-undo' });
  const edit = await turn(
    '安排任务。',
    fixed(
      proposal('UPDATE_TASK', {
        taskId: t.id,
        title: 'safe-undo-changed',
        expectedVersion: t.version,
      }),
    ),
    { type: 'TASK', id: t.id },
  );
  assert.equal(edit.status, 'SUCCESS');
  await tasks.updateTask(a.id, {
    id: t.id,
    version: 2,
    title: 'new-user-edit',
  });
  await assert.rejects(undoGroup(a.id, edit.id, edit.result!.undoToken!));
  assert.equal(
    (await tasks.getTask(a.id, { id: t.id })).title,
    'new-user-edit',
  );
  pass(phase + ' undo cannot overwrite later edits');
  phase = 'invalid user clock';
  const noNumbers = await turn('记一下，我有点累。');
  assert.equal(noNumbers.status, 'SUCCESS');
  const onlyMood = await status.getRecord(a.id, {
    id: noNumbers.result!.createdEntities[0].id,
  });
  assert.equal(onlyMood.energy, null);
  assert.equal(onlyMood.mood, 'TIRED');
  const countBeforeGuess = (await status.listRecords(a.id)).length;
  assert.equal(
    (
      await turn(
        '记一下，我有点累。',
        fixed(proposal('RECORD_STATUS', { mood: 'TIRED', energy: 4 })),
      )
    ).status,
    'FAILED',
  );
  assert.equal((await status.listRecords(a.id)).length, countBeforeGuess);
  pass('status values are never inferred from fatigue');
  const countBeforeMedium = await taskCount();
  assert.equal(
    (
      await turn(
        '创建任务。',
        fixed(proposal('CREATE_TASK', { title: 'should-clarify' }, 'MEDIUM')),
      )
    ).status,
    'CLARIFICATION',
  );
  assert.equal(await taskCount(), countBeforeMedium);
  pass('medium confidence asks clarification before any action');
  const undoable = await tasks.createTask(a.id, {
    title: 'undo-edit-original',
  });
  const edited = await turn(
    '安排任务。',
    fixed(
      proposal('UPDATE_TASK', {
        taskId: undoable.id,
        title: 'undo-edit-changed',
        expectedVersion: 1,
      }),
    ),
    { type: 'TASK', id: undoable.id },
  );
  assert.equal(edited.status, 'SUCCESS');
  await undoGroup(a.id, edited.id, edited.result!.undoToken!);
  assert.equal(
    (await tasks.getTask(a.id, { id: undoable.id })).title,
    'undo-edit-original',
  );
  await undoGroup(a.id, create.id, create.result!.undoToken!);
  await assert.rejects(
    tasks.getTask(a.id, { id: create.result!.createdEntities[0].id }),
  );
  pass('CREATE_TASK and UPDATE_TASK undo restore safe domain state');
  const atomicCount = await taskCount();
  await assert.rejects(
    rawDb.transaction(async (tx) =>
      inDomainTransaction(tx, async () => {
        await tasks.createTask(a.id, { title: 'must-rollback-with-receipt' });
        await tx.execute('select 1 / 0');
      }),
    ),
  );
  assert.equal(await taskCount(), atomicCount);
  assert.equal(
    Number(
      (
        await databaseClient`select count(*) as n from tasks where owner_id=${a.id} and title='must-rollback-with-receipt'`
      )[0].n,
    ),
    0,
  );
  pass('domain mutation rolls back with orchestration transaction');
  const recoveryTask = await tasks.createTask(a.id, {
      title: 'committed-before-interruption',
    }),
    recoveryId = randomUUID();
  await databaseClient`insert into action_groups(id,owner_id,source_conversation_id,request_id,fingerprint,status,created_at) values(${recoveryId},${a.id},${chat.id},${randomUUID()},'recovery-fixture','PROCESSING',now()-interval '3 minutes')`;
  await databaseClient`insert into action_executions(action_group_id,position,action_type,payload,status,execution_result,reversible) values(${recoveryId},0,'CREATE_TASK','{}'::jsonb,'SUCCESS',${JSON.stringify({ type: 'TASK', id: recoveryTask.id, version: 1, created: true })}::jsonb,true)`;
  const recovered = await getTurn(a.id, { id: recoveryId });
  assert.equal(recovered.status, 'SUCCESS');
  assert.equal(recovered.result?.createdEntities[0].id, recoveryTask.id);
  assert.equal((await tasks.getTask(a.id, { id: recoveryTask.id })).version, 1);
  assert.equal((await getTurn(a.id, { id: recoveryId })).id, recoveryId);
  pass('interrupted turn recovers receipts without replay');
  const beforeInvalid = await taskCount();
  assert.equal((await turn('二十五点提醒我拿快递。')).status, 'CLARIFICATION');
  assert.equal(await taskCount(), beforeInvalid);
  pass(phase + ' invalid time causes no domain writes');
  phase = 'HTTP permissions';
  for (const path of [
    '/lim/conversations/' + chat.id,
    '/lim/turns/' + first.id,
    '/lim/turns/' + first.id + '/trace',
  ]) {
    assert.equal((await http(path)).status, 401);
    assert.equal((await http(path, b)).status, 404);
  }
  assert.equal(
    (await http('/lim/turns', a, { ...input('x'), ownerId: b.id })).status,
    400,
  );
  const csrf = await fetch(api + '/lim/conversations', {
    method: 'POST',
    headers: { Cookie: a.cookie, 'Content-Type': 'application/json' },
    body: '{}',
  });
  assert.equal(csrf.status, 403);
  pass(phase + ' HTTP owner isolation, strict fields and Origin');
  const persisted = await getConversation(a.id, { id: chat.id });
  assert.ok(persisted.messages.length > 10);
  await assert.rejects(getConversation(b.id, { id: chat.id }));
  await assert.rejects(getTurn(b.id, { id: first.id }));
  const trace = await getTrace(a.id, { id: sourceOnly.id });
  assert.ok(!JSON.stringify(trace).includes('https://example.org'));
  pass('persistence and redacted development trace');
  const originalEnv=process.env.APP_ENV,originalLimProvider=process.env.LIM_PROVIDER;process.env.APP_ENV='production';process.env.LIM_PROVIDER='mock';await assert.rejects(getTrace(a.id,{id:sourceOnly.id}));assert.notEqual(providerStatus().kind,'development-mock');process.env.APP_ENV=originalEnv;if(originalLimProvider===undefined)delete process.env.LIM_PROVIDER;else process.env.LIM_PROVIDER=originalLimProvider;pass('production disables development trace and mock selection');
  if (isAiConfigured()) {
    const real = await runtimeModel.propose('你好，不执行任何行动。', {
      asOf: new Date().toISOString(),
      timeZone: 'Asia/Shanghai',
      mode: 'TALK',
      domains: ['UI'],
      current: null,
      candidates: [],
      userHistory: [],
    });
    assert.ok(real);
    console.log(
      'Real configured provider response received; deterministic mutation tests use mock.',
    );
  } else console.log('Real provider not configured; no cloud success claimed.');
  console.log(
    'LIM-001–023 and additional safety checks passed against real PostgreSQL.',
  );
} catch (e) {
  console.error(
    'FAIL Lim at ' +
      phase +
      '; ' +
      (e instanceof Error ? e.name : 'UnknownError'),
  );
  const x = e as { actual?: unknown; expected?: unknown; stack?: string };
  const safe = (v: unknown) =>
    typeof v === 'number' ||
    (typeof v === 'string' &&
      /^(SUCCESS|PARTIAL|FAILED|CLARIFICATION|PLANNED|COMPLETED|DONE|NOT_SUBMITTED|SUBMITTED|\d{4}-\d\d-\d\dT[0-9:.+Z-]+)$/.test(
        v,
      ))
      ? v
      : undefined;
  console.error(
    JSON.stringify({
      actual: safe(x.actual),
      expected: safe(x.expected),
      at: x.stack
        ?.split('\n')
        .find((l) => l.includes('verify-lim.ts'))
        ?.trim(),
    }),
  );
  process.exitCode = 1;
} finally {
  for (const a of identities) {
    assert.ok(
      a.email.startsWith('lim-verification-') &&
        a.email.endsWith('@local.invalid'),
    );
    await databaseClient.begin(async (sql) => {
      await sql`delete from ai_chats where user_id=${a.id}`;
      await sql`delete from sessions where user_id=${a.id}`;
      await sql`delete from accounts where user_id=${a.id}`;
      await sql`delete from users where id=${a.id} and email=${a.email}`;
    });
  }
  await databaseClient.end({ timeout: 2 });
}
