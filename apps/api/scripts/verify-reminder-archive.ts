import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import { databaseClient } from '../src/db';
import * as reminders from '../src/resources/reminder-rules/methods';
import * as notifications from '../src/resources/notification-instances/methods';
import * as logs from '../src/resources/captain-logs/methods';
import * as archive from '../src/resources/archive-entries/methods';
import { getHistory } from '../src/resources/archive-entries/history';
import * as taskMethods from '../src/resources/tasks/methods';
import * as statusMethods from '../src/resources/status-moments/methods';
import * as learningMethods from '../src/resources/learning-records/methods';
import * as semesterMethods from '../src/resources/semesters/methods';
import { seedArchive } from './seed-archive';
import { seedUniversity } from './seed-university';
import { createConversation, sendTurn } from '../src/resources/lim/methods';
import { getHome } from '../src/resources/home/methods';
import type { LimModel } from '../src/resources/lim/provider';
if (process.env.APP_ENV !== 'development')
  throw new Error('Development acceptance only');
const identities: { id: string; email: string; cookie: string }[] = [],
  api = process.env.API_URL!,
  origin = process.env.WEB_URL!;
let phase = 'startup';
const pass = (name: string) => console.log('PASS ' + name);
async function request(
  path: string,
  owner?: (typeof identities)[number],
  body?: unknown,
  method = body ? 'POST' : 'GET',
) {
  return fetch(api + path, {
    method,
    headers: {
      Origin: origin,
      'Content-Type': 'application/json',
      ...(owner ? { Cookie: owner.cookie } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
}
const fixed = (type: string, payload: Record<string, unknown>): LimModel => ({
  propose: async () => ({
    mode: 'EXECUTE',
    reply: '',
    clarification: null,
    actions: [{ type, confidence: 'HIGH', payload }],
  }),
});
try {
  process.env.DEV_NOW = '2030-10-17T07:00:00Z';
  for (const suffix of ['a', 'b']) {
    const email =
      'phase7-verification-' + randomUUID() + suffix + '@local.invalid';
    const response = await request('/api/auth/sign-up/email', undefined, {
      email,
      password: randomBytes(24).toString('base64url'),
      name: 'Phase 7 verification',
    });
    assert.equal(response.status, 200);
    const { user } = (await response.json()) as { user: { id: string } };
    identities.push({
      id: user.id,
      email,
      cookie: response.headers
        .getSetCookie()
        .map((s) => s.split(';')[0])
        .join('; '),
    });
  }
  const [a, b] = identities;
  phase = 'REM-001/004/006';
  const task = await taskMethods.createTask(a.id, { title: '拿快递' }),
    requestInput = {
      title: '拿快递',
      scheduledAt: '2030-10-17T08:00:00Z',
      sourceType: 'TASK',
      sourceId: task.id,
    };
  const [rule, retry] = await Promise.all([
    reminders.createReminder(a.id, requestInput),
    reminders.createReminder(a.id, requestInput),
  ]);
  assert.equal(rule.id, retry.id);
  assert.equal(rule.status, 'ACTIVE');
  assert.equal((await notifications.listNotifications(a.id)).length, 0);
  const [stored] =
    await databaseClient`select count(*)::int as n from reminder_rules where owner_id=${a.id}`;
  assert.equal(stored.n, 1);
  pass(
    phase + ' persistent separate rule, concurrent logical retries deduplicate',
  );
  phase = 'REM-002/003';
  await reminders.reconcileReminders(new Date('2030-10-17T07:59:00Z'), a.id);
  assert.equal((await notifications.listNotifications(a.id)).length, 0);
  await Promise.all([
    reminders.reconcileReminders(new Date('2030-10-17T08:00:00Z'), a.id),
    reminders.reconcileReminders(new Date('2030-10-17T08:00:00Z'), a.id),
  ]);
  await reminders.reconcileReminders(new Date('2030-10-17T08:10:00Z'), a.id);
  let delivered = await notifications.listNotifications(a.id);
  assert.equal(delivered.length, 1);
  assert.equal(delivered[0].reminderRuleId, rule.id);
  assert.equal((await reminders.listReminders(a.id))[0].status, 'FIRED');
  assert.equal(
    (await reminders.createReminder(a.id, requestInput)).id,
    rule.id,
  );
  pass(
    phase +
      ' repeated/concurrent recovery creates one occurrence; actual process restart tested in browser journey',
  );
  phase = 'REM-005';
  let notification = await notifications.setNotificationState(a.id, {
    id: delivered[0].id,
    version: delivered[0].version,
    action: 'READ',
  });
  assert.ok(notification.readAt);
  notification = await notifications.setNotificationState(a.id, {
    id: notification.id,
    version: notification.version,
    action: 'DISMISS',
  });
  assert.ok(notification.dismissedAt);
  assert.equal((await reminders.listReminders(a.id)).length, 1);
  await databaseClient`update reminder_rules set title='changed rule' where owner_id=${a.id} and id=${rule.id}`;
  assert.equal(
    (await notifications.listNotifications(a.id))[0].title,
    '拿快递',
  );
  pass(
    phase +
      ' read/dismiss preserve rule; occurrence title survives later rule changes',
  );
  phase = 'REM-007/008';
  const quietAt = '2030-10-18T00:40:00+08:00';
  const deferred = await reminders.createReminder(a.id, {
    title: '普通安静提醒',
    scheduledAt: quietAt,
  });
  await reminders.createReminder(a.id, {
    title: '静默提醒',
    scheduledAt: quietAt,
    quietHoursPolicy: 'SILENT',
  });
  await assert.rejects(() =>
    reminders.createReminder(a.id, {
      title: '未确认关键',
      scheduledAt: quietAt,
      priority: 'P0',
    }),
  );
  await reminders.createReminder(a.id, {
    title: '明确关键',
    scheduledAt: quietAt,
    priority: 'P0',
    confirmCritical: true,
  });
  await reminders.reconcileReminders(
    new Date('2030-10-18T00:41:00+08:00'),
    a.id,
  );
  const pending = (await reminders.listReminders(a.id)).find(
    (r) => r.id === deferred.id,
  )!;
  assert.equal(pending.status, 'ACTIVE');
  assert.equal(
    pending.nextTriggerAt,
    new Date('2030-10-18T07:30:00+08:00').toISOString(),
  );
  delivered = await notifications.listNotifications(a.id);
  assert.equal(delivered.length, 3);
  assert.equal(delivered.find((n) => n.title === '静默提醒')?.silent, true);
  assert.equal(delivered.find((n) => n.title === '明确关键')?.silent, false);
  await reminders.reconcileReminders(
    new Date('2030-10-18T07:30:00+08:00'),
    a.id,
  );
  assert.equal((await notifications.listNotifications(a.id)).length, 4);
  pass(phase + ' defer/silent and explicitly confirmed P0 bypass');
  phase = 'REM-009';
  assert.equal((await reminders.listReminders(b.id)).length, 0);
  assert.equal((await notifications.listNotifications(b.id)).length, 0);
  await assert.rejects(() =>
    reminders.cancelReminder(b.id, { id: rule.id, version: 1 }),
  );
  await assert.rejects(() =>
    notifications.setNotificationState(b.id, {
      id: notification.id,
      version: notification.version,
      action: 'READ',
    }),
  );
  pass(phase + ' owner isolation for rules and notifications');
  phase = 'REM-010/011';
  const conversation = await createConversation(a.id, {}),
    turnInput = {
      conversationId: conversation.id,
      requestId: randomUUID(),
      sourceRoute: '/app',
      sourceEntity: null,
      shareRefs: [],
      timeZone: 'Asia/Shanghai',
      content: '下午四点提醒我拿快递。',
    };
  const [beforeTasks] =
    await databaseClient`select count(*)::int as n from tasks where owner_id=${a.id}`;
  const result = await sendTurn(
    a.id,
    turnInput,
    fixed('CREATE_REMINDER', {
      title: '拿快递',
      scheduledAt: '2030-10-17T08:00:00Z',
    }),
  );
  assert.equal(result.status, 'SUCCESS');
  assert.equal(result.result?.createdEntities[0].type, 'REMINDER_RULE');
  assert.equal(
    (
      await sendTurn(a.id, turnInput, {
        propose: async () => {
          throw new Error('should not run');
        },
      })
    ).id,
    result.id,
  );
  const [afterTasks] =
    await databaseClient`select count(*)::int as n from tasks where owner_id=${a.id}`;
  assert.equal(beforeTasks.n, afterTasks.n);
  const beforeRules = await reminders.listReminders(a.id);
  assert.equal(
    (
      await sendTurn(
        a.id,
        {
          ...turnInput,
          requestId: randomUUID(),
          content: '明天提醒我拿快递。',
        },
        {
          propose: async () => {
            throw new Error('test provider offline');
          },
        },
      )
    ).status,
    'FAILED',
  );
  assert.deepEqual(await reminders.listReminders(a.id), beforeRules);
  assert.equal(
    (
      await sendTurn(
        a.id,
        {
          ...turnInput,
          requestId: randomUUID(),
          content: '不要提醒我拿快递。',
        },
        fixed('CREATE_REMINDER', {
          title: '拿快递',
          scheduledAt: '2030-10-17T08:00:00Z',
        }),
      )
    ).status,
    'FAILED',
  );
  pass(
    phase +
      ' registered R1 reminder, no Task creation, retries/provider outage/negation safe',
  );
  phase = 'HOME relevance';
  const important = await reminders.createReminder(a.id, {
    title: '重要临近',
    scheduledAt: '2030-10-17T07:30:00Z',
    priority: 'P1',
  });
  await reminders.createReminder(a.id, {
    title: '普通临近',
    scheduledAt: '2030-10-17T07:20:00Z',
  });
  const home = await getHome(a.id);
  assert.equal(home.upcomingReminder?.id, important.id);
  assert.ok(!JSON.stringify(home).includes('普通临近'));
  pass(
    phase +
      ' one important upcoming signal, no notification feed or archive on HOME',
  );
  phase = 'ARCH-001/002/009';
  const before =
    await databaseClient`select (select count(*) from tasks where owner_id=${a.id})::int as tasks,(select count(*) from goals where owner_id=${a.id})::int as goals,(select count(*) from learning_records where owner_id=${a.id})::int as learning`;
  const body =
    '  今天开始觉得 LIFE HUD\r\n可能不只是一个大学工具，\r\n而是真的可以陪我走很久。\n\n';
  let log = await logs.createLog(a.id, { body, aiAccessPolicy: 'NEVER' });
  assert.equal((await logs.getLog(a.id, { id: log.id })).body, body);
  log = await logs.updateLog(a.id, {
    id: log.id,
    version: log.version,
    aiAccessPolicy: 'EXPLICIT_ONLY',
  });
  assert.equal(log.body, body);
  await assert.rejects(() =>
    logs.updateLog(a.id, {
      id: log.id,
      version: log.version,
      summary: 'rewrite',
      body: 'invented',
    }),
  );
  assert.deepEqual(
    await databaseClient`select (select count(*) from tasks where owner_id=${a.id})::int as tasks,(select count(*) from goals where owner_id=${a.id})::int as goals,(select count(*) from learning_records where owner_id=${a.id})::int as learning`,
    before,
  );
  pass(
    phase +
      ' exact whitespace/newlines survive policy edit; no AI overwrite or auto-taskification',
  );
  phase = 'ARCH-003/004/006';
  const marker = await archive.createEntry(a.id, {
    title: '第一次跑通 Assignment → Task → Lim',
    links: [
      { sourceType: 'TASK', sourceId: task.id },
      { sourceType: 'CAPTAIN_LOG', sourceId: log.id },
    ],
  });
  let history = await getHistory(a.id, {});
  const item = history.items.find((x) => x.sourceId === marker.id)!;
  assert.equal(item.links.length, 2);
  assert.equal(item.links.find((l) => l.sourceId === task.id)?.title, '拿快递');
  await taskMethods.removeTask(a.id, {
    id: task.id,
    version: task.version,
    confirm: true,
  });
  history = await getHistory(a.id, {});
  assert.equal(
    history.items
      .find((x) => x.sourceId === marker.id)
      ?.links.find((l) => l.sourceId === task.id)?.available,
    false,
  );
  const [sourceCopy] =
    await databaseClient`select count(*)::int as n from information_schema.columns where table_name='archive_entry_links' and column_name in ('body','title','task_json','snapshot')`;
  assert.equal(sourceCopy.n, 0);
  pass(
    phase +
      ' markers reference sources, deleted source remains unavailable without stale copy',
  );
  phase = 'ARCH-005/011';
  const completed = await taskMethods.createTask(a.id, {
    title: '今天完成的事',
  });
  await taskMethods.completeTask(a.id, {
    id: completed.id,
    version: completed.version,
  });
  await statusMethods.createRecord(a.id, { energy: 2 });
  const learning = await learningMethods.createRecord(a.id, {
    title: '过拟合与 LIFE HUD 推荐系统',
  });
  const day = '2030-10-17';
  const timeline = await getHistory(a.id, { day });
  for (const type of ['STATUS_MOMENT', 'CAPTAIN_LOG', 'ARCHIVE_ENTRY'])
    assert.ok(timeline.items.some((x) => x.sourceType === type));
  const actualDay = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
  }).format(new Date());
  const actualTimeline = await getHistory(a.id, { day: actualDay });
  for (const type of ['TASK', 'LEARNING_RECORD'])
    assert.ok(actualTimeline.items.some((x) => x.sourceType === type));
  const search = await getHistory(a.id, { q: 'LIFE HUD' });
  assert.ok(search.items.some((x) => x.sourceId === log.id));
  assert.ok(search.items.some((x) => x.sourceId === learning.id));
  const linked = await archive.createEntry(a.id, {
    title: '一个链接',
    links: [{ sourceType: 'LEARNING_RECORD', sourceId: learning.id }],
  });
  assert.ok(
    (await getHistory(a.id, { q: '过拟合' })).items.some(
      (x) => x.sourceId === linked.id,
    ),
  );
  pass(
    phase +
      ' canonical daily timeline and historical body/title/linked-title keyword lookup',
  );
  phase = 'ARCH-007/privacy';
  await assert.rejects(() => logs.getLog(b.id, { id: log.id }));
  await assert.rejects(() =>
    archive.createEntry(b.id, {
      links: [{ sourceType: 'CAPTAIN_LOG', sourceId: log.id }],
    }),
  );
  assert.equal((await getHistory(b.id, { q: 'LIFE HUD' })).items.length, 0);
  const privateLog = await logs.createLog(a.id, {
    body: '高隐私日志不可泄露',
    privacyLevel: 'HIGH_PRIVATE',
    aiAccessPolicy: 'NEVER',
  });
  assert.ok(
    !(await getHistory(a.id, {})).items.some(
      (x) => x.sourceId === privateLog.id,
    ),
  );
  assert.ok(
    (await getHistory(a.id, { includeSensitive: true })).items.some(
      (x) => x.sourceId === privateLog.id,
    ),
  );
  await assert.rejects(() =>
    archive.createEntry(a.id, {
      links: [{ sourceType: 'CAPTAIN_LOG', sourceId: privateLog.id }],
    }),
  );
  const [audits] =
    await databaseClient`select count(*)::int as n from audit_logs where owner_id=${a.id} and entity_id=${privateLog.id} and action='SensitiveRecordAccessed'`;
  assert.ok(audits.n > 0);
  pass(
    phase +
      ' owner scope, high-privacy opt-in/audit and no privacy downgrade in links',
  );
  phase = 'ARCH-008/Lim archive';
  log = await logs.updateLog(a.id, {
    id: log.id,
    version: log.version,
    aiAccessPolicy: 'NEVER',
  });
  const ordinary = await createConversation(a.id, {});
  let calls = 0;
  await sendTurn(
    a.id,
    {
      ...turnInput,
      conversationId: ordinary.id,
      requestId: randomUUID(),
      content: '帮我看看学习上下文？',
    },
    {
      propose: async (_text, pack) => {
        calls++;
        assert.ok(!JSON.stringify(pack).includes(body));
        assert.ok(!JSON.stringify(pack).includes(privateLog.body));
        return {
          mode: 'ASSIST',
          reply: '看看当前安排。',
          clarification: null,
          actions: [],
        };
      },
    },
  );
  assert.equal(calls, 1);
  const authored = '  今天第一次感觉 LIFE HUD 真有可能做出来。\r\n';
  await sendTurn(
    a.id,
    {
      ...turnInput,
      conversationId: ordinary.id,
      requestId: randomUUID(),
      content: authored,
    },
    {
      propose: async () => ({
        mode: 'TALK',
        reply: '我在听。',
        clarification: null,
        actions: [],
      }),
    },
  );
  const saved = await sendTurn(
    a.id,
    {
      ...turnInput,
      conversationId: ordinary.id,
      requestId: randomUUID(),
      content: '把刚才这段存成 Captain’s Log。',
    },
    fixed('CREATE_CAPTAIN_LOG', { body: authored }),
  );
  assert.equal(saved.status, 'SUCCESS');
  const [captainPayload]=await databaseClient`select e.payload from action_executions e join action_groups g on g.id=e.action_group_id where g.owner_id=${a.id} and e.action_type='CREATE_CAPTAIN_LOG' and e.status='SUCCESS' limit 1`;
  assert.deepEqual(captainPayload.payload,{});
  assert.equal(
    (await logs.getLog(a.id, { id: saved.result!.createdEntities[0].id })).body,
    authored,
  );
  const malicious = await sendTurn(
    a.id,
    {
      ...turnInput,
      conversationId: ordinary.id,
      requestId: randomUUID(),
      content: '把刚才这段存成 Captain’s Log。',
    },
    fixed('CREATE_CAPTAIN_LOG', { body: 'AI rewrote the story' }),
  );
  assert.equal(malicious.status, 'FAILED');
  const moment = await sendTurn(
    a.id,
    {
      ...turnInput,
      conversationId: ordinary.id,
      requestId: randomUUID(),
      content: 'Lim，把这一刻记下来。',
      sourceEntity: { type: 'LEARNING_RECORD', id: learning.id },
    },
    fixed('REMEMBER_MOMENT', {}),
  );
  assert.equal(moment.status, 'SUCCESS');
  assert.ok(
    (await getHistory(a.id, {})).items
      .find((x) => x.sourceId === moment.result!.createdEntities[0].id)
      ?.links.some((l) => l.sourceId === learning.id),
  );
  pass(
    phase +
      ' ordinary Lim excludes logs; explicit log/moment use registry and exact actual authored text',
  );
  phase = 'ARCH-010';
  const university = await seedUniversity(a.id, '2030-10-17');
  let semester = await semesterMethods.getRecord(a.id, {
    id: university.semesterId,
  });
  semester = await semesterMethods.updateRecord(a.id, {
    id: semester.id,
    version: semester.version,
    status: 'COMPLETED',
  });
  const historical = await getHistory(a.id, { semesterId: semester.id });
  assert.ok(
    historical.semesters.some(
      (s) => s.id === semester.id && s.status === 'COMPLETED',
    ),
  );
  assert.ok(historical.items.some((x) => x.sourceType === 'CLASS_SESSION'));
  await assert.rejects(() => getHistory(b.id, { semesterId: semester.id }));
  pass(phase + ' completed semester remains browsable; scope owner is checked');
  phase = 'HTTP boundaries';
  const [exam]=await databaseClient`select id from exams where owner_id=${a.id} limit 1`;
  for(const [sourceType,sourceId] of [['ASSIGNMENT',university.assignmentId],['EXAM',String(exam.id)]]){const linkedRule=await reminders.createReminder(a.id,{title:'来源引用 '+sourceType,scheduledAt:'2030-10-20T08:00:00Z',sourceType,sourceId});assert.equal(linkedRule.sourceId,sourceId);await assert.rejects(()=>reminders.createReminder(b.id,{title:'跨用户来源',scheduledAt:'2030-10-20T08:00:00Z',sourceType,sourceId}));}
  assert.equal((await request('/reminder-rules')).status, 401);
  assert.equal((await request('/captain-logs/' + log.id, b)).status, 404);
  assert.equal(
    (await request('/archive-entries/history?ownerId=' + b.id, a)).status,
    400,
  );
  assert.equal(
    (
      await request('/reminder-rules/' + important.id + '/cancel', b, {
        id: important.id,
        version: important.version,
      })
    ).status,
    404,
  );
  const http = await request('/reminder-rules', a, {
    title: '真实 HTTP 提醒',
    scheduledAt: '2030-10-19T08:00:00Z',
  });
  assert.equal(http.status, 200);
  assert.equal(
    (await request('/archive-entries/history?q=LIFE%20HUD', a)).status,
    200,
  );
  const browserQuery = await request(
    '/archive-entries/history?includeSensitive=false&timeZone=Asia%2FShanghai&q=',
    a,
  );
  if (browserQuery.status !== 200)
    console.error(
      'Archive browser query validation: ' + (await browserQuery.text()),
    );
  assert.equal(browserQuery.status, 200);
  pass(phase + ' actual auth, strict inputs and owner isolation');
  phase = 'fixture idempotence';
  const fixture = await seedArchive(a.id, '2030-10-17'),
    fixtureLog = await logs.getLog(a.id, { id: fixture.logId });
  await logs.updateLog(a.id, {
    id: fixtureLog.id,
    version: fixtureLog.version,
    body: '用户后来修改的原文',
  });
  await seedArchive(a.id, '2030-10-17');
  assert.equal(
    (await logs.getLog(a.id, { id: fixture.logId })).body,
    '用户后来修改的原文',
  );
  pass(phase + ' explicit stable archive fixtures preserve user edits');
  console.log(
    'REM-001–011 / ARCH-001–011 and additional real service boundaries passed.',
  );
} catch (error) {
  console.error(
    'FAIL Phase 7 at ' +
      phase +
      '; ' +
      (error instanceof Error ? error.name : 'UnknownError'),
  );
  const stack = (error as Error)?.stack;
  console.error(
    stack
      ?.split('\n')
      .find((s) => s.includes('verify-reminder-archive.ts'))
      ?.trim(),
  );
  process.exitCode = 1;
} finally {
  for (const a of identities) {
    assert.ok(
      a.email.startsWith('phase7-verification-') &&
        a.email.endsWith('@local.invalid'),
    );
    await databaseClient.begin(async (tx) => {
      await tx`delete from ai_chats where user_id=${a.id}`;
      await tx`delete from sessions where user_id=${a.id}`;
      await tx`delete from accounts where user_id=${a.id}`;
      await tx`delete from users where id=${a.id} and email=${a.email}`;
    });
  }
  await databaseClient.end({ timeout: 2 });
}
