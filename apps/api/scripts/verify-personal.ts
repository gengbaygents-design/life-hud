import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import { databaseClient } from '../src/db';
import { seedUniversity } from './seed-university';
import { seedPersonal } from './seed-personal';
import { assertReflectionAuthor } from '../src/resources/personal-rules';
import { dispatchPendingEvents } from '../src/resources/outbox-events/methods';
import { handleTaskCompleted } from '../src/resources/assignments/handlers/task-completed';
import type { getGrowth } from '../src/resources/growth/methods';
type Row = { id: string; version: number };
type Moment = Row & {
  mood: string | null;
  energy: number | null;
  note: string | null;
  recordedAt: string;
  privacyLevel: string;
};
type Learning = Row & {
  title: string;
  sourceKind: string | null;
  sourceRef: string | null;
  reflection: string | null;
  createdBy: string;
  applications: string | null;
};
type Evidence = Row & {
  skillId: string;
  sourceType: string;
  sourceId: string;
  evidenceType: string;
};
type Skill = Row & { state: string; name: string };
type Account = { id: string; email: string; cookie: string };
type Growth = Awaited<ReturnType<typeof getGrowth>>;
const accounts: Account[] = [],
  objects: { key: string; account: Account }[] = [];
const api = process.env.API_URL!,
  origin = process.env.WEB_URL!;
let phase = 'startup';
async function request(
  path: string,
  a?: Account,
  body?: unknown,
  method = body ? 'POST' : 'GET',
  retried = false,
): Promise<Response> {
  const r = await fetch(api + path, {
    method,
    headers: {
      Origin: origin,
      ...(body instanceof FormData
        ? {}
        : { 'Content-Type': 'application/json' }),
      ...(a ? { Cookie: a.cookie } : {}),
    },
    body:
      body instanceof FormData
        ? body
        : body === undefined
          ? undefined
          : JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });
  if (r.status === 429 && !retried) {
    const wait = Number(
      r.headers.get('retry-after') || r.headers.get('x-retry-after'),
    );
    if (wait > 0 && wait <= 10) {
      await r.body?.cancel();
      await new Promise((r) => setTimeout(r, wait * 1000 + 250));
      return request(path, a, body, method, true);
    }
  }
  return r;
}
async function read<T = Row>(
  path: string,
  a?: Account,
  body?: unknown,
  method?: string,
): Promise<T> {
  const r = await request(path, a, body, method);
  assert.equal(r.status, 200, phase + ' HTTP');
  return (await r.json()) as T;
}
const pass = (name: string) => console.log('PASS ' + name);
const reflection =
  '如果系统太依赖我过去的行为，\n会不会反过来把我固定成某种人？';
try {
  for (const suffix of ['a', 'b']) {
    const email =
      'personal-verification-' + randomUUID() + suffix + '@local.invalid';
    const r = await request('/api/auth/sign-up/email', undefined, {
      email,
      password: randomBytes(24).toString('base64url'),
      name: 'Personal verification',
    });
    assert.equal(r.status, 200);
    const { user } = (await r.json()) as { user: { id: string } };
    accounts.push({
      id: user.id,
      email,
      cookie: r.headers
        .getSetCookie()
        .map((c) => c.split(';')[0])
        .join('; '),
    });
  }
  const [a, b] = accounts;
  phase = 'STATUS partial captures';
  let morning = await read<Moment>('/status-moments', a, {
    mood: 'CALM',
    recordedAt: '2026-10-16T09:05:00+08:00',
  });
  assert.equal(morning.energy, null);
  pass('STATUS-001 mood-only valid');
  const afternoon = await read<Moment>('/status-moments', a, {
    energy: 2,
    recordedAt: '2026-10-16T13:10:00+08:00',
  });
  assert.equal(afternoon.mood, null);
  pass('STATUS-002 energy-only valid');
  assert.notEqual(morning.id, afternoon.id);
  assert.equal((await read<Moment[]>('/status-moments', a)).length, 2);
  pass('STATUS-003 multiple moments same day coexist');
  assert.equal(
    (await read<Moment>('/status-moments/' + morning.id, a)).mood,
    'CALM',
  );
  pass('STATUS-004 later record preserves earlier one');
  type Snapshot = {
    moment: { id: string; mood: string | null; energy: number | null } | null;
    asOf: string;
  };
  let snapshot = await read<Snapshot>('/status/snapshot', a);
  assert.equal(snapshot.moment?.id, afternoon.id);
  pass('STATUS-006 latest relevant real snapshot');
  assert.equal((await request('/status-moments', a, {})).status, 400);
  assert.equal(
    (await request('/status-moments', a, { energy: 6 })).status,
    400,
  );
  assert.equal(
    (await request('/status-moments', a, { mood: 'OTHER' })).status,
    400,
  );
  morning = await read<Moment>(
    '/status-moments/' + morning.id,
    a,
    { id: morning.id, version: morning.version, note: '自己的备注' },
    'PUT',
  );
  assert.equal(
    (
      await request(
        '/status-moments/' + morning.id,
        a,
        { id: morning.id, version: 1, note: 'stale' },
        'PUT',
      )
    ).status,
    409,
  );
  pass('partial validation and optimistic versions');
  const high = await read<Moment>('/status-moments', a, {
    mood: 'ANXIOUS',
    note: 'HIGH_PRIVATE_STATUS_FIXTURE',
    privacyLevel: 'HIGH_PRIVATE',
    bodyStateJson: { description: 'PRIVATE_BODY_FIXTURE' },
    recordedAt: '2026-10-16T14:20:00+08:00',
  });
  await read('/status-moments', a, {
    mood: 'HAPPY',
    privacyLevel: 'VAULT',
    recordedAt: '2026-10-16T14:25:00+08:00',
  });
  await read('/status-moments', a, {
    mood: 'HAPPY',
    recordedAt: '2026-10-16T15:00:00+08:00',
  });
  snapshot = await read<Snapshot>('/status/snapshot', a);
  assert.equal(snapshot.moment?.id, afternoon.id);
  assert.ok(!JSON.stringify(snapshot).includes('PRIVATE'));
  assert.ok(!('note' in snapshot.moment!));
  assert.ok(!('bodyStateJson' in snapshot.moment!));
  pass(
    'HOME excludes high-private/vault/future moments and all sensitive details',
  );
  const sleep = await read('/sleep-records', a, {
    sleepStart: '2026-10-16T01:10:00+08:00',
    wakeAt: '2026-10-16T08:05:00+08:00',
  });
  const water = await read('/water-records', a, {
    recordedAt: '2026-10-16T10:30:00+08:00',
    amountMl: 300,
  });
  await read('/water-records', a, {
    recordedAt: '2026-10-16T13:40:00+08:00',
    amountMl: 250,
  });
  const exercise = await read('/exercise-records', a, {
    activityType: '散步',
    startedAt: '2026-10-16T12:00:00+08:00',
    endedAt: '2026-10-16T12:20:00+08:00',
    durationMinutes: 20,
  });
  const status = await read<{
    sleep: { durationMinutes: number }[];
    waterByDay: { amountMl: number }[];
    moments: Moment[];
  }>('/status?days=7&timeZone=Asia%2FShanghai', a);
  assert.equal(status.sleep[0].durationMinutes, 415);
  assert.equal(status.waterByDay[0].amountMl, 550);
  assert.ok(status.moments.some((m) => m.id === high.id));
  assert.ok(!('cycle' in status));
  assert.ok(!JSON.stringify(status).includes('睡眠不足'));
  pass('sleep duration, water totals, exercise and trends are recorded facts');
  const [statusAccess] =
    await databaseClient`select count(*)::int as count from audit_logs where owner_id=${a.id} and entity_id=${high.id} and action='SensitiveRecordAccessed'`;
  assert.ok(statusAccess.count > 0);
  pass('high-private Status views are auditable without content logging');
  phase = 'Cycle privacy';
  const cycle = await read<Row & { privacyLevel: string; aiPolicy: string }>(
    '/cycle-records',
    a,
    {
      startDate: '2026-10-16',
      note: 'CYCLE_PRIVATE_FIXTURE',
      symptomsJson: { description: 'PRIVATE_SYMPTOM_FIXTURE' },
    },
  );
  assert.equal(cycle.privacyLevel, 'HIGH_PRIVATE');
  assert.equal(cycle.aiPolicy, 'NEVER');
  pass('STATUS-008 Cycle defaults HIGH_PRIVATE and NEVER');
  assert.equal(
    (
      await request(
        '/cycle-records/' + cycle.id,
        a,
        { id: cycle.id, version: cycle.version, privacyLevel: 'NORMAL' },
        'PUT',
      )
    ).status,
    400,
  );
  await read('/cycle-records/' + cycle.id, a);
  const [access] =
    await databaseClient`select count(*)::int as count from audit_logs where owner_id=${a.id} and entity_id=${cycle.id} and action='SensitiveRecordAccessed'`;
  assert.ok(access.count > 0);
  const cycleAudit = await read<{ action: string }[]>(
    '/audit-logs?entityType=CYCLE_RECORD',
    a,
  );
  assert.ok(cycleAudit.some((r) => r.action === 'SensitiveRecordAccessed'));
  assert.deepEqual(await read('/audit-logs?entityType=CYCLE_RECORD', b), []);
  assert.ok(
    !JSON.stringify(await read('/status', a)).includes('CYCLE_PRIVATE_FIXTURE'),
  );
  assert.ok(!('prediction' in cycle));
  pass(
    'STATUS-009 no prediction/LLM feature; explicit cycle reads audited and absent from general snapshots',
  );
  phase = 'Growth source-only';
  const project = await read('/projects', a, {
    title: 'LIFE HUD · Project #001',
  });
  const university = await seedUniversity(a.id, '2026-10-16');
  const sourceOnly = await read<Learning>('/learning-records', a, {
    title: 'Agent Memory 架构文章',
    sourceKind: 'URL',
    sourceRef: 'https://example.com/agent-memory',
  });
  assert.equal(sourceOnly.reflection, null);
  assert.equal(sourceOnly.createdBy, a.id);
  pass('GROWTH-001 source-only legal with null reflection');
  assert.deepEqual(await read('/skills', a), []);
  assert.deepEqual(await read('/skill-evidence', a), []);
  pass('GROWTH-002 source-only creates no mastery or evidence');
  let skill = await read<Skill>('/skills', a, { name: 'AI / Agent Systems' });
  const contact = await read<Evidence>('/skill-evidence', a, {
    skillId: skill.id,
    evidenceType: 'CONTACT',
    sourceType: 'LEARNING_RECORD',
    sourceId: sourceOnly.id,
  });
  assert.equal((await read<Skill>('/skills/' + skill.id, a)).state, 'EXPOSED');
  pass('GROWTH-003 CONTACT references source-only without upgrading');
  const learning = await read<Learning>('/learning-records', a, {
    title: '过拟合与 LIFE HUD 推荐系统',
    sourceKind: 'COURSE',
    sourceRef: university.courseIds.ai,
    reflection,
    projectId: project.id,
  });
  assert.equal(learning.reflection, reflection);
  assert.equal(
    (await read<Learning>('/learning-records/' + learning.id, a)).reflection,
    reflection,
  );
  pass('GROWTH-004 authored reflection persists exactly');
  assert.equal(
    (
      await request(
        '/learning-records/' + learning.id,
        a,
        {
          id: learning.id,
          version: learning.version,
          reflection: 'generated overwrite',
          generatedSummary: 'AI summary',
        },
        'PUT',
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await request('/learning-records', a, {
        title: 'fake author',
        createdBy: 'AI',
      })
    ).status,
    400,
  );
  assert.throws(() =>
    assertReflectionAuthor('GENERATED', { reflection: 'generated overwrite' }),
  );
  assert.equal(
    (await read<Learning>('/learning-records/' + learning.id, a)).reflection,
    reflection,
  );
  pass('GROWTH-005 generated fields/origin cannot write user reflection');
  const highLearning = await read<Learning>('/learning-records', a, {
    title: '私密学习记录',
    reflection: 'HIGH_PRIVATE_LEARNING_FIXTURE',
    privacyLevel: 'HIGH_PRIVATE',
  });
  await read('/growth', a);
  const [growthAccess] =
    await databaseClient`select count(*)::int as count from audit_logs where owner_id=${a.id} and entity_id=${highLearning.id} and action='SensitiveRecordAccessed'`;
  assert.ok(growthAccess.count > 0);
  pass(
    'high-private Growth views are auditable without authored-content logging',
  );
  const growth = await read<Growth>('/growth', a);
  assert.ok(
    growth.links.some(
      (l) =>
        l.fromId === learning.id &&
        l.toId === project.id &&
        l.relationType === 'APPLIED_TO',
    ),
  );
  assert.ok(growth.projects.some((p) => p.id === project.id));
  pass(
    'GROWTH-006 LearningRecord links to existing Core Project via EntityLink',
  );
  const mistake = await read('/learning-mistakes', a, {
    title: '洛必达法则使用条件混淆',
    sourceType: 'ASSIGNMENT',
    sourceId: university.assignmentId,
    mistakeDescription: '没有先检查适用条件。',
  });
  pass('GROWTH-007 LearningMistake references real Assignment');
  assert.equal(
    (
      await request('/skill-evidence', a, {
        skillId: skill.id,
        evidenceType: 'UNDERSTANDING',
        sourceType: 'LEARNING_RECORD',
        sourceId: sourceOnly.id,
        note: '只保存了链接',
        confirmEvidence: true,
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await request(
        '/skills/' + skill.id,
        a,
        {
          id: skill.id,
          version: skill.version,
          state: 'UNDERSTANDING',
          confirmState: true,
        },
        'PUT',
      )
    ).status,
    400,
  );
  const proof = await read<Evidence>('/skill-evidence', a, {
    skillId: skill.id,
    evidenceType: 'UNDERSTANDING',
    sourceType: 'LEARNING_RECORD',
    sourceId: learning.id,
    note: '我写下了对推荐系统偏差的自己的理解。',
    confirmEvidence: true,
  });
  assert.equal((await read<Skill>('/skills/' + skill.id, a)).state, 'EXPOSED');
  assert.equal(
    (
      await request(
        '/skills/' + skill.id,
        a,
        { id: skill.id, version: skill.version, state: 'UNDERSTANDING' },
        'PUT',
      )
    ).status,
    400,
  );
  skill = await read<Skill>(
    '/skills/' + skill.id,
    a,
    {
      id: skill.id,
      version: skill.version,
      state: 'UNDERSTANDING',
      confirmState: true,
    },
    'PUT',
  );
  assert.equal(skill.state, 'UNDERSTANDING');
  pass(
    'GROWTH-008 qualitative state requires evidence and explicit confirmation',
  );
  assert.equal(proof.sourceId, learning.id);
  assert.equal(
    (
      await request('/skill-evidence', a, {
        skillId: skill.id,
        evidenceType: 'CONTACT',
        sourceType: 'LEARNING_RECORD',
        sourceId: randomUUID(),
      })
    ).status,
    404,
  );
  pass('GROWTH-009 evidence source must exist and belong to owner');
  assert.equal(
    (
      await request(
        '/skills/' + skill.id,
        a,
        {
          id: skill.id,
          version: skill.version,
          state: 'PROVEN',
          confirmState: true,
        },
        'PUT',
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await request('/skills', a, {
        name: 'fake',
        masteryPercentage: 82,
        xp: 100,
      })
    ).status,
    400,
  );
  assert.ok(
    !JSON.stringify(await read('/growth', a)).includes('masteryPercentage'),
  );
  pass(
    'GROWTH-010 no percent/XP/mastery automation; PROVEN requires OUTPUT evidence',
  );
  phase = 'all owner scopes';
  for (const [resource, row] of [
    ['status-moments', morning],
    ['sleep-records', sleep],
    ['water-records', water],
    ['exercise-records', exercise],
    ['cycle-records', cycle],
    ['learning-records', learning],
    ['learning-mistakes', mistake],
    ['skills', skill],
    ['skill-evidence', proof],
  ] as const) {
    const foreign = await request('/' + resource + '/' + row.id, b),
      missing = await request('/' + resource + '/' + randomUUID(), b);
    assert.equal(foreign.status, 404);
    assert.deepEqual(await foreign.json(), await missing.json());
    assert.equal(
      (
        await request(
          '/' + resource + '/' + row.id,
          b,
          { id: row.id, version: row.version },
          'PUT',
        )
      ).status,
      404,
    );
    assert.equal(
      (
        await request(
          '/' + resource + '/' + row.id,
          b,
          { id: row.id, version: row.version, confirm: true },
          'DELETE',
        )
      ).status,
      404,
    );
    assert.deepEqual(await read('/' + resource, b), []);
  }
  pass('STATUS-007 all Status resource read/write isolation');
  pass('GROWTH-011 all Growth resource read/write isolation');
  const bSkill = await read<Skill>('/skills', b, { name: 'B skill' });
  assert.equal(
    (
      await request('/skill-evidence', b, {
        skillId: bSkill.id,
        evidenceType: 'CONTACT',
        sourceType: 'LEARNING_RECORD',
        sourceId: learning.id,
      })
    ).status,
    404,
  );
  assert.equal(
    (
      await request('/skill-evidence', b, {
        skillId: skill.id,
        evidenceType: 'CONTACT',
        sourceType: 'LEARNING_RECORD',
        sourceId: learning.id,
      })
    ).status,
    404,
  );
  assert.equal(
    (
      await request('/learning-records', b, {
        title: 'foreign course',
        sourceKind: 'COURSE',
        sourceRef: university.courseIds.ai,
      })
    ).status,
    404,
  );
  assert.equal(
    (
      await request('/entity-links', b, {
        fromType: 'LEARNING_RECORD',
        fromId: learning.id,
        relationType: 'APPLIED_TO',
        toType: 'PROJECT',
        toId: project.id,
      })
    ).status,
    404,
  );
  pass(
    'cross-domain sources, Skill FK and APPLIED_TO references are owner scoped',
  );
  phase = 'Study boundary';
  const before = (await read<Learning[]>('/learning-records', a)).length;
  const assignment = await read<Row & { taskId: string }>(
    '/assignments/' + university.assignmentId,
    a,
  );
  const task = await read<Row>('/tasks/' + assignment.taskId, a);
  await read('/tasks/' + task.id + '/complete', a, {
    id: task.id,
    version: task.version,
  });
  await dispatchPendingEvents(
    new Map([['TaskCompleted', handleTaskCompleted]]),
    100,
  );
  assert.equal((await read<Learning[]>('/learning-records', a)).length, before);
  assert.equal(
    (await read<Learning>('/learning-records/' + learning.id, a)).reflection,
    reflection,
  );
  pass(
    'Study completion creates no reflective LearningRecord or authored prose',
  );
  phase = 'Core File source';
  const form = new FormData();
  form.set(
    'file',
    new File(['personal-source-fixture'], 'source.txt', { type: 'text/plain' }),
  );
  const file = await read<{ fileId: string; key: string }>(
    '/files/upload',
    a,
    form,
  );
  objects.push({ key: file.key, account: a });
  const fileRecord = await read<Learning>('/learning-records', a, {
    title: '已有文件来源',
    sourceKind: 'FILE',
    sourceRef: file.fileId,
  });
  assert.equal(fileRecord.reflection, null);
  assert.equal(
    (await request('/files/remove', a, { key: file.key, confirm: true }))
      .status,
    409,
  );
  await read(
    '/learning-records/' + fileRecord.id,
    a,
    { id: fileRecord.id, version: fileRecord.version, confirm: true },
    'DELETE',
  );
  assert.equal(
    (await request('/files/remove', a, { key: file.key, confirm: true }))
      .status,
    200,
  );
  pass(
    'File sources reuse protected Core identity; no bytes/reflection duplication',
  );
  phase = 'erase and proof removal';
  assert.equal(
    (
      await request(
        '/skill-evidence/' + proof.id,
        a,
        { id: proof.id, version: proof.version, confirm: true },
        'DELETE',
      )
    ).status,
    400,
  );
  skill = await read<Skill>(
    '/skills/' + skill.id,
    a,
    {
      id: skill.id,
      version: skill.version,
      state: 'EXPOSED',
      confirmState: true,
    },
    'PUT',
  );
  await read(
    '/skill-evidence/' + proof.id,
    a,
    { id: proof.id, version: proof.version, confirm: true },
    'DELETE',
  );
  assert.ok(contact.id);
  pass('last evidence cannot silently leave an unsupported confirmed state');
  const temporarySkill = await read<Skill>('/skills', a, { name: '临时技能' });
  const temporaryProof = await read<Evidence>('/skill-evidence', a, {
    skillId: temporarySkill.id,
    evidenceType: 'CONTACT',
    sourceType: 'LEARNING_RECORD',
    sourceId: sourceOnly.id,
  });
  await read(
    '/skills/' + temporarySkill.id,
    a,
    { id: temporarySkill.id, version: temporarySkill.version, confirm: true },
    'DELETE',
  );
  await read(
    '/skill-evidence/' + temporaryProof.id,
    a,
    { id: temporaryProof.id, version: temporaryProof.version, confirm: true },
    'DELETE',
  );
  pass('evidence remains removable after its Skill is soft deleted');
  await read(
    '/cycle-records/' + cycle.id,
    a,
    { id: cycle.id, version: cycle.version, confirm: true },
    'DELETE',
  );
  const [erased] =
    await databaseClient`select count(*)::int as count from cycle_records where id=${cycle.id}`;
  assert.equal(erased.count, 0);
  const logs =
    await databaseClient`select metadata from audit_logs where owner_id=${a.id}`;
  assert.ok(!JSON.stringify(logs).includes('CYCLE_PRIVATE_FIXTURE'));
  assert.ok(!JSON.stringify(logs).includes(reflection));
  pass(
    'explicit cycle erasure is hard delete; audit stores no sensitive content',
  );
  phase = 'seed idempotence';
  const seeded = await seedPersonal(a.id, '2026-10-16');
  const created = await read<Learning>(
    '/learning-records/' + seeded.reflectionId,
    a,
  );
  const edited = await read<Learning>(
    '/learning-records/' + created.id,
    a,
    {
      id: created.id,
      version: created.version,
      reflection: '  我后来亲自改写的原文\n不被种子覆盖。  ',
    },
    'PUT',
  );
  const counts = (await read<Learning[]>('/learning-records', a)).length;
  await seedPersonal(a.id, '2026-10-16');
  assert.equal((await read<Learning[]>('/learning-records', a)).length, counts);
  assert.equal(
    (await read<Learning>('/learning-records/' + edited.id, a)).reflection,
    edited.reflection,
  );
  assert.equal(
    (await read<Skill>('/skills/' + seeded.skillIds.ai, a)).state,
    'UNDERSTANDING',
  );
  assert.equal(
    (await read<Skill>('/skills/' + seeded.skillIds.design, a)).state,
    'PRACTICING',
  );
  assert.equal(
    (await read<Skill>('/skills/' + seeded.skillIds.web, a)).state,
    'EXPOSED',
  );
  assert.deepEqual(await read('/cycle-records', a), []);
  assert.equal(
    (await read<Growth>('/growth', a)).projects.filter(
      (p) => p.title === 'LIFE HUD · Project #001',
    ).length,
    1,
  );
  pass(
    'explicit stable fixtures preserve edits, reuse Project and exclude cycle by default',
  );
  console.log(
    'Personal domain acceptance passed. HOME capture/reload verified separately in real browser.',
  );
} catch (e) {
  console.error(
    'FAIL Personal at ' +
      phase +
      '; ' +
      (e instanceof Error ? e.name : 'UnknownError'),
  );
  const x = e as { actual?: unknown; expected?: unknown };
  console.error(
    JSON.stringify({
      actual: typeof x.actual === 'number' ? x.actual : undefined,
      expected: typeof x.expected === 'number' ? x.expected : undefined,
    }),
  );
  process.exitCode = 1;
} finally {
  for (const o of objects)
    await request('/files/remove', o.account, { key: o.key, confirm: true });
  for (const a of accounts) {
    assert.ok(
      a.email.startsWith('personal-verification-') &&
        a.email.endsWith('@local.invalid'),
    );
    await databaseClient.begin(async (sql) => {
      await sql`delete from sessions where user_id=${a.id}`;
      await sql`delete from accounts where user_id=${a.id}`;
      await sql`delete from users where id=${a.id} and email=${a.email}`;
    });
  }
  await databaseClient.end({ timeout: 2 });
}
