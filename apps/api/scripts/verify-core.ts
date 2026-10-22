import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { databaseClient, rawDb } from '../src/db';
import { tasks } from '../src/resources/tasks/tasks.schema';
import { auditLogs } from '../src/resources/audit-logs/audit-logs.schema';
import { outboxEvents } from '../src/resources/outbox-events/outbox-events.schema';
import { domainWrite, recordChange } from '../src/resources/core-methods';
import {
  dispatchPendingEvents,
  type LocalEventHandler,
} from '../src/resources/outbox-events/methods';
import type { getTask } from '../src/resources/tasks/methods';
import { seedCore, seedId } from './seed-core';

type Task = Awaited<ReturnType<typeof getTask>>;
type Account = { id: string; cookie: string; email: string };
const accounts: Account[] = [],
  results: string[] = [];
let phase = 'readiness';
const base = process.env.API_URL!,
  origin = process.env.WEB_URL!;
async function request(
  path: string,
  account?: Account,
  body?: unknown,
  method = body ? 'POST' : 'GET',
  retried = false,
): Promise<Response> {
  const response = await fetch(base + path, {
    method,
    headers: {
      Origin: origin,
      'Content-Type': 'application/json',
      ...(account ? { Cookie: account.cookie } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });
  if (response.status === 429 && !retried) {
    const wait = Number(
      response.headers.get('x-retry-after') ||
        response.headers.get('retry-after'),
    );
    if (wait > 0 && wait <= 10) {
      await response.body?.cancel();
      await new Promise((resolve) => setTimeout(resolve, wait * 1000 + 250));
      return request(path, account, body, method, true);
    }
  }
  return response;
}
async function read<T>(
  path: string,
  account?: Account,
  body?: unknown,
  method?: string,
): Promise<T> {
  const response = await request(path, account, body, method);
  assert.equal(response.status, 200, phase + ' HTTP status');
  return (await response.json()) as T;
}
const pass = (name: string) => {
  results.push(name);
  console.log('PASS ' + name);
};
try {
  for (let attempt = 0; attempt < 30; attempt++) {
    const response = await request('/health/ready').catch(() => null);
    if (response?.status === 200) break;
    if (attempt === 29) throw new Error('LOCAL_SERVICES_NOT_READY');
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  for (const suffix of ['a', 'b']) {
    const email =
      'core-verification-' + randomUUID() + '-' + suffix + '@local.invalid';
    const response = await request('/api/auth/sign-up/email', undefined, {
      email,
      password: randomBytes(24).toString('base64url'),
      name: 'Core verification',
    });
    assert.equal(response.status, 200);
    const data = (await response.json()) as { user: { id: string } };
    accounts.push({
      id: data.user.id,
      email,
      cookie: response.headers
        .getSetCookie()
        .map((value) => value.split(';')[0])
        .join('; '),
    });
  }
  const [a, b] = accounts;
  phase = 'CORE bootstrap';
  const voyage = await read<{ id: string; ownerId: string; status: string }>(
    '/voyages/ensure-current',
    a,
    {},
  );
  const same = await read<{ id: string }>('/voyages/ensure-current', a, {});
  assert.equal(same.id, voyage.id);
  assert.equal(voyage.ownerId, a.id);
  assert.equal(voyage.status, 'ACTIVE');
  pass('CORE current University Voyage is persisted and idempotent');
  assert.equal((await request('/tasks')).status, 401);
  const wrongOrigin = await fetch(base + '/tasks', {
    method: 'POST',
    headers: {
      Origin: 'http://127.0.0.1:3999',
      Cookie: a.cookie,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title: '拒绝跨来源写入' }),
    signal: AbortSignal.timeout(5000),
  });
  assert.equal(wrongOrigin.status, 403);
  pass('CORE unauthenticated and wrong-origin access rejected');
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const part = (type: string) =>
    parts.find((value) => value.type === type)!.value;
  const day = `${part('year')}-${part('month')}-${part('day')}`;
  const at = (time: string) =>
    new Date(day + 'T' + time + ':00+08:00').toISOString();
  phase = 'CORE-001';
  let task = await read<Task>('/tasks', a, {
    title: '高数第三章作业',
    plannedStart: at('20:00'),
    dueAt: at('23:59'),
    estimatedMinutes: 35,
    ownerId: b.id,
    id: randomUUID(),
    status: 'COMPLETED',
  });
  assert.equal(task.ownerId, a.id);
  assert.equal(task.status, 'PLANNED');
  assert.equal(task.version, 1);
  pass(
    'CORE-001 authenticated owner creates Task; client owner/status ignored',
  );
  phase = 'CORE-002';
  for (const [method, suffix, body] of [
    ['GET', '', undefined],
    ['PUT', '', { title: '不得写入', version: task.version }],
    ['POST', '/start', { version: task.version }],
    ['POST', '/complete', { version: task.version }],
    ['POST', '/delay', { version: task.version, plannedStart: at('21:00') }],
    ['POST', '/drop', { version: task.version, confirm: true }],
    ['DELETE', '', { version: task.version, confirm: true }],
    ['GET', '/history', undefined],
  ] as const)
    assert.equal(
      (await request('/tasks/' + task.id + suffix, b, body, method)).status,
      404,
    );
  pass(
    'CORE-002 foreign read/update/start/complete/delay/drop/delete/history collapse to 404',
  );
  phase = 'QUEST-001';
  assert.deepEqual(await read<Task>('/tasks/' + task.id, a), task);
  pass('QUEST-001 Task survives independent API refetch');
  phase = 'QUEST-002';
  assert.equal(task.plannedStart, at('20:00'));
  assert.equal(task.dueAt, at('23:59'));
  pass('QUEST-002 planned execution and deadline are independent');
  phase = 'QUEST-003';
  task = await read<Task>('/tasks/' + task.id + '/delay', a, {
    version: task.version,
    plannedStart: at('21:00'),
  });
  assert.equal(task.plannedStart, at('21:00'));
  assert.equal(task.dueAt, at('23:59'));
  assert.equal(task.status, 'PLANNED');
  pass('QUEST-003 delay moves plan, preserves deadline');
  phase = 'QUEST-007';
  const stale = await request(
    '/tasks/' + task.id,
    a,
    { version: 1, title: '不应覆盖' },
    'PUT',
  );
  assert.equal(stale.status, 409);
  assert.deepEqual(await read<Task>('/tasks/' + task.id, a), task);
  pass('QUEST-007 stale version conflicts without overwrite');
  const raced = await Promise.all(
    ['整理高数练习', '检查高数练习'].map((title) =>
      request('/tasks/' + task.id, a, { version: task.version, title }, 'PUT'),
    ),
  );
  assert.deepEqual(raced.map((response) => response.status).sort(), [200, 409]);
  task = await read<Task>('/tasks/' + task.id, a);
  assert.equal(task.version, 3);
  assert.equal(task.dueAt, at('23:59'));
  pass('CORE concurrent updates permit exactly one writer');
  task = await read<Task>(
    '/tasks/' + task.id,
    a,
    { version: task.version, plannedStart: at('21:30') },
    'PUT',
  );
  assert.equal(task.plannedStart, at('21:30'));
  assert.equal(task.dueAt, at('23:59'));
  pass('QUEST editing planned time alone preserves deadline');
  const beforeInvalid = task;
  assert.equal(
    (
      await request(
        '/tasks/' + task.id,
        a,
        { version: task.version, plannedEnd: at('20:00') },
        'PUT',
      )
    ).status,
    400,
  );
  assert.deepEqual(await read<Task>('/tasks/' + task.id, a), beforeInvalid);
  pass('QUEST invalid planning range leaves record untouched');
  task = await read<Task>('/tasks/' + task.id + '/start', a, {
    version: task.version,
  });
  assert.equal(task.status, 'ACTIVE');
  assert.equal(task.dueAt, at('23:59'));
  pass('CORE explicit start preserves schedule and deadline');
  phase = 'QUEST-004';
  task = await read<Task>('/tasks/' + task.id + '/complete', a, {
    version: task.version,
    actualMinutes: 32,
  });
  assert.equal(task.status, 'COMPLETED');
  assert.ok(task.completedAt);
  assert.equal(task.actualMinutes, 32);
  pass('QUEST-004 complete sets COMPLETED and completedAt');
  phase = 'QUEST-005';
  const events = await read<
    { id: string; eventType: string; payload: Record<string, unknown> }[]
  >('/outbox-events?entityId=' + task.id, a);
  for (const name of ['TaskCreated', 'TaskDelayed', 'TaskCompleted'])
    assert.ok(events.some((event) => event.eventType === name));
  assert.equal(
    events.find((event) => event.eventType === 'TaskCompleted')!.payload
      .version,
    task.version,
  );
  pass(
    'QUEST-005 TaskCreated/TaskDelayed/TaskCompleted Outbox events persisted',
  );
  phase = 'QUEST-006';
  const history = await read<
    {
      id: string;
      ownerId: string;
      actorId: string;
      entityId: string;
      action: string;
      metadata: Record<string, unknown>;
      createdAt: string;
    }[]
  >('/tasks/' + task.id + '/history', a);
  const audit = history.find((item) => item.action === 'TaskCompleted')!;
  assert.equal(audit.actorId, a.id);
  assert.equal(audit.ownerId, a.id);
  assert.equal(audit.entityId, task.id);
  assert.ok(audit.createdAt);
  assert.ok(audit.metadata.before);
  assert.ok(audit.metadata.after);
  assert.equal(
    events.find((event) => event.eventType === 'TaskCompleted')!.payload
      .auditId,
    audit.id,
  );
  assert.equal((await request('/audit-logs/' + audit.id, b)).status, 404);
  assert.equal(
    (await request('/outbox-events/' + events[0].id, b)).status,
    404,
  );
  pass(
    'QUEST-006 audit who/what/entity/when plus event correlation and owner isolation',
  );
  phase = 'QUEST-008';
  const removed = await read<Task>('/tasks', a, {
    title: '可删除的本地临时记录',
  });
  assert.equal(
    (
      await request(
        '/tasks/' + removed.id,
        a,
        { version: removed.version },
        'DELETE',
      )
    ).status,
    400,
  );
  const deleted = await read<Task>(
    '/tasks/' + removed.id,
    a,
    { version: removed.version, confirm: true },
    'DELETE',
  );
  assert.ok(deleted.deletedAt);
  assert.equal((await request('/tasks/' + removed.id, a)).status, 404);
  assert.ok(
    !(await read<Task[]>('/tasks', a)).some((item) => item.id === removed.id),
  );
  pass('QUEST-008 soft-deleted Task omitted from ordinary reads');
  phase = 'QUEST-009';
  let active = await read<Task>('/tasks', a, {
    title: '整理 LIFE HUD 架构',
    importance: 'HIGH',
  });
  active = await read<Task>('/tasks/' + active.id + '/start', a, {
    version: active.version,
  });
  const board = await read<{ now: { task: Task; reason: string }[] }>(
    '/tasks/board?timeZone=Asia%2FShanghai',
    a,
  );
  assert.equal(board.now[0].task.id, active.id);
  assert.equal(board.now[0].reason, '正在进行');
  assert.ok(!('score' in board.now[0]));
  pass('QUEST-009 NOW returns explainable real candidate');
  phase = 'QUEST-010';
  const empty = await read<{
    now: unknown[];
    today: unknown[];
    inbox: unknown[];
  }>('/tasks/board', b);
  assert.deepEqual(empty, { now: [], today: [], inbox: [] });
  pass('QUEST-010 empty owner receives a quiet empty board');
  phase = 'QUEST-011';
  const before = await read<Task[]>('/tasks', a);
  await read('/tasks/board', a);
  await read('/tasks/board', a);
  assert.deepEqual(await read<Task[]>('/tasks', a), before);
  pass('QUEST-011 candidate reads do not mutate skipped tasks');
  phase = 'CORE resources and links';
  const project = await read<{ id: string; version: number }>('/projects', a, {
    title: 'LIFE HUD · Project #001',
    voyageId: voyage.id,
    ownerId: b.id,
  });
  const goal = await read<{ id: string; version: number }>('/goals', a, {
    title: '建立可靠的个人工作空间',
  });
  for (const [resource, id] of [
    ['voyages', voyage.id],
    ['projects', project.id],
    ['goals', goal.id],
  ]) {
    assert.equal((await request('/' + resource + '/' + id, b)).status, 404);
    assert.equal(
      (
        await request(
          '/' + resource + '/' + id,
          b,
          { version: 1, title: '拒绝越权' },
          'PUT',
        )
      ).status,
      404,
    );
    assert.equal(
      (
        await request(
          '/' + resource + '/' + id,
          b,
          { version: 1, confirm: true },
          'DELETE',
        )
      ).status,
      404,
    );
  }
  assert.equal(
    (
      await request('/projects', b, {
        title: '拒绝跨用户引用',
        voyageId: voyage.id,
      })
    ).status,
    404,
  );
  assert.equal(
    (
      await request('/tasks', b, {
        title: '拒绝跨用户项目',
        projectId: project.id,
      })
    ).status,
    404,
  );
  const linked = await read<Task>('/tasks', a, {
    title: '整理项目资料',
    projectId: project.id,
  });
  const links = await read<{ id: string; version: number; toId: string }[]>(
    '/entity-links?entityId=' + linked.id,
    a,
  );
  assert.ok(links.some((link) => link.toId === project.id));
  assert.equal(
    (
      await request('/entity-links', b, {
        fromType: 'TASK',
        fromId: linked.id,
        toType: 'GOAL',
        toId: goal.id,
        relationType: 'RELATED_TO',
      })
    ).status,
    404,
  );
  const link = await read<{ id: string; version: number }>('/entity-links', a, {
    fromType: 'TASK',
    fromId: linked.id,
    toType: 'GOAL',
    toId: goal.id,
    relationType: 'RELATED_TO',
  });
  assert.equal(
    (
      await request(
        '/entity-links/' + link.id,
        b,
        { version: link.version, confirm: true },
        'DELETE',
      )
    ).status,
    404,
  );
  await read(
    '/entity-links/' + link.id,
    a,
    { version: link.version, confirm: true },
    'DELETE',
  );
  pass(
    'CORE Voyage/Project/Goal/EntityLink owner isolation and semantic links',
  );
  const updatedProject = await read<{ version: number }>(
    '/projects/' + project.id,
    a,
    { version: project.version, title: 'LIFE HUD · Project #001（已更新）' },
    'PUT',
  );
  assert.equal(updatedProject.version, 2);
  assert.equal(
    (
      await request(
        '/projects/' + project.id,
        a,
        { version: 1, title: '旧版本' },
        'PUT',
      )
    ).status,
    409,
  );
  pass('CORE version pattern reused by Project');
  phase = 'CORE DB owner constraint';
  await assert.rejects(
    rawDb
      .insert(tasks)
      .values({
        ownerId: b.id,
        title: '不得跨所有者关联',
        projectId: project.id,
      }),
    (error) => {
      const typed = error as { cause?: { code?: string }; code?: string };
      return (typed.cause?.code ?? typed.code) === '23503';
    },
  );
  pass('CORE database composite FK rejects cross-owner association');
  phase = 'CORE transaction rollback';
  const rollbackId = randomUUID();
  await assert.rejects(
    domainWrite(async (tx) => {
      await tx
        .insert(tasks)
        .values({ id: rollbackId, ownerId: a.id, title: '应整体回滚的任务' });
      await recordChange(
        tx,
        a.id,
        'TASK',
        rollbackId,
        'TaskCreated',
        {},
        { taskId: rollbackId, version: 1 },
      );
      throw new Error('INTENTIONAL_ROLLBACK');
    }),
  );
  assert.equal(
    (await rawDb.select().from(tasks).where(eq(tasks.id, rollbackId))).length,
    0,
  );
  assert.equal(
    (
      await rawDb
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.entityId, rollbackId))
    ).length,
    0,
  );
  assert.equal(
    (
      await rawDb
        .select()
        .from(outboxEvents)
        .where(eq(outboxEvents.entityId, rollbackId))
    ).length,
    0,
  );
  pass('CORE task/audit/outbox rollback together');
  phase = 'CORE Outbox dispatch';
  const eventType = 'Verification' + randomUUID();
  const [event] = await rawDb
    .insert(outboxEvents)
    .values({
      ownerId: a.id,
      entityType: 'TASK',
      entityId: active.id,
      eventType,
      payload: {},
    })
    .returning();
  assert.deepEqual(await dispatchPendingEvents(new Map()), {
    processed: 0,
    failed: 0,
  });
  const failHandler: LocalEventHandler = async (event, tx) => {
    await tx
      .insert(auditLogs)
      .values({
        ownerId: event.ownerId,
        actorId: event.ownerId,
        entityType: 'TASK',
        entityId: event.id,
        action: 'VerificationReaction',
        metadata: {},
      });
    throw new Error('PRIVATE_ERROR_MUST_NOT_PERSIST');
  };
  assert.equal(
    (await dispatchPendingEvents(new Map([[eventType, failHandler]]))).failed,
    1,
  );
  let [outbox] = await rawDb
    .select()
    .from(outboxEvents)
    .where(eq(outboxEvents.id, event.id));
  assert.equal(outbox.processedAt, null);
  assert.equal(outbox.lastError, 'HANDLER_FAILED');
  assert.equal(
    (
      await rawDb
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.entityId, event.id))
    ).length,
    0,
  );
  const handler: LocalEventHandler = async (event, tx) => {
    await tx
      .insert(auditLogs)
      .values({
        ownerId: event.ownerId,
        actorId: event.ownerId,
        entityType: 'TASK',
        entityId: event.id,
        action: 'VerificationReaction',
        metadata: {},
      });
  };
  const handlers = new Map([[eventType, handler]]);
  const afterBackoff = new Date(Date.now() + 10000);
  const workers = await Promise.all([
    dispatchPendingEvents(handlers, 5, afterBackoff),
    dispatchPendingEvents(handlers, 5, afterBackoff),
  ]);
  assert.equal(
    workers.reduce((count, item) => count + item.processed, 0),
    1,
  );
  assert.equal(
    (
      await rawDb
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.entityId, event.id))
    ).length,
    1,
  );
  [outbox] = await rawDb
    .select()
    .from(outboxEvents)
    .where(eq(outboxEvents.id, event.id));
  assert.ok(outbox.processedAt);
  assert.deepEqual(await dispatchPendingEvents(handlers), {
    processed: 0,
    failed: 0,
  });
  pass(
    'CORE Outbox retries, rolls back failed handler and prevents double delivery',
  );
  phase = 'CORE lifecycle drop/reopen';
  let dropped = await read<Task>('/tasks', a, { title: '允许放下再回来的事' });
  dropped = await read<Task>('/tasks/' + dropped.id + '/drop', a, {
    version: dropped.version,
    confirm: true,
  });
  assert.equal(dropped.status, 'DROPPED');
  dropped = await read<Task>('/tasks/' + dropped.id + '/reopen', a, {
    version: dropped.version,
  });
  assert.equal(dropped.status, 'INBOX');
  pass('CORE drop is confirmed, history retained, reopen available');
  phase = 'CORE own CRUD roundtrips';
  let extraVoyage = await read<{ id: string; version: number }>('/voyages', a, {
    title: '大学的一段回顾',
    status: 'COMPLETED',
    startAt: at('09:00'),
    endAt: at('12:00'),
    parentVoyageId: voyage.id,
  });
  assert.equal(
    (
      await request(
        '/voyages/' + voyage.id,
        a,
        { version: 1, parentVoyageId: extraVoyage.id },
        'PUT',
      )
    ).status,
    400,
  );
  extraVoyage = await read(
    '/voyages/' + extraVoyage.id,
    a,
    { version: extraVoyage.version, summary: '明确保存的航程说明' },
    'PUT',
  );
  await read(
    '/voyages/' + extraVoyage.id,
    a,
    { version: extraVoyage.version, confirm: true },
    'DELETE',
  );
  assert.equal((await request('/voyages/' + extraVoyage.id, a)).status, 404);
  const changedGoal = await read<{ id: string; version: number }>(
    '/goals/' + goal.id,
    a,
    {
      version: goal.version,
      title: '建立稳定的工作节奏',
      targetDate: at('23:59'),
    },
    'PUT',
  );
  const goalLink = await read<{ id: string }>('/entity-links', a, {
    fromType: 'TASK',
    fromId: linked.id,
    toType: 'GOAL',
    toId: goal.id,
    relationType: 'RELATED_TO',
  });
  await read(
    '/goals/' + goal.id,
    a,
    { version: changedGoal.version, confirm: true },
    'DELETE',
  );
  assert.ok(
    !(await read<{ id: string }[]>('/entity-links', a)).some(
      (row) => row.id === goalLink.id,
    ),
  );
  assert.equal((await request('/goals/' + goal.id, a)).status, 404);
  await read(
    '/projects/' + project.id,
    a,
    { version: updatedProject.version, confirm: true },
    'DELETE',
  );
  assert.ok(
    !(await read<{ id: string }[]>('/projects', a)).some(
      (row) => row.id === project.id,
    ),
  );
  assert.equal(
    (
      await request('/tasks', a, {
        title: '不允许指向已删除项目',
        projectId: project.id,
      })
    ).status,
    404,
  );
  pass(
    'CORE own CRUD, hierarchy cycle rejection and related-link soft deletion',
  );
  phase = 'CORE development fixtures';
  const first = await seedCore(a.id);
  assert.equal(first.created, 5);
  assert.equal((await seedCore(a.id)).created, 0);
  const seeded = await read<Task>('/tasks/' + seedId(a.id, 'math'), a);
  assert.equal(seeded.title, '高数第三章作业');
  assert.equal(seeded.estimatedMinutes, 35);
  assert.equal(
    (await read<Task>('/tasks/' + seedId(a.id, 'visual'), a)).status,
    'COMPLETED',
  );
  pass('CORE explicit dev seed persists meaningful fixtures idempotently');
  console.log(
    'PASS real Core/QUEST API acceptance: ' +
      results.length +
      ' checks; HOME/browser journey is verified separately.',
  );
} catch (error) {
  console.error(
    'FAIL Core acceptance at ' +
      phase +
      '; ' +
      (error instanceof Error ? error.name : 'UnknownError') +
      '. Credentials and raw database errors omitted.',
  );
  process.exitCode = 1;
} finally {
  try {
    for (const account of accounts) {
      assert.ok(
        account.email.startsWith('core-verification-') &&
          account.email.endsWith('@local.invalid'),
      );
      await databaseClient.begin(async (sql) => {
        await sql`delete from sessions where user_id=${account.id}`;
        await sql`delete from accounts where user_id=${account.id}`;
        await sql`delete from verifications where value=${account.id}`;
        await sql`delete from users where id=${account.id} and email=${account.email}`;
      });
    }
  } catch {
    console.error('Core verification fixture cleanup failed.');
    process.exitCode = 1;
  }
  await databaseClient.end({ timeout: 2 });
}
