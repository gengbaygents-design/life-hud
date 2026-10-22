import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import { databaseClient } from '../src/db';
import { getHome } from '../src/resources/home/methods';
import { attentionReply } from '../src/resources/home/lim-recommendation';
import { seedHome } from './seed-home';
import * as tasks from '../src/resources/tasks/methods';
import * as academic from '../src/resources/assignments/methods';
import * as status from '../src/resources/status-moments/methods';
import * as cycle from '../src/resources/cycle-records/methods';
import {
  createConversation,
  sendTurn,
  getTrace,
} from '../src/resources/lim/methods';
import { dispatchPendingEvents } from '../src/resources/outbox-events/methods';
import { handleTaskCompleted } from '../src/resources/assignments/handlers/task-completed';
import { selectClockNow } from '../src/resources/core-clock';
if (process.env.APP_ENV !== 'development')
  throw new Error('Development acceptance only');
const identities: { id: string; email: string; cookie: string }[] = [],
  api = process.env.API_URL!,
  origin = process.env.WEB_URL!;
const at = (clock: string, day = '2026-10-16') =>
  new Date(day + 'T' + clock + ':00+08:00');
let phase = 'startup';
const pass = (label: string) => console.log('PASS ' + label);
async function request(
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
      return request(path, a, body, method, true);
    }
  }
  return r;
}
try {
  for (const suffix of ['a', 'b']) {
    const email =
      'home-verification-' + randomUUID() + suffix + '@local.invalid';
    const r = await request('/api/auth/sign-up/email', undefined, {
      email,
      password: randomBytes(24).toString('base64url'),
      name: 'Home verification',
    });
    assert.equal(r.status, 200);
    const { user } = (await r.json()) as { user: { id: string } };
    identities.push({
      id: user.id,
      email,
      cookie: r.headers
        .getSetCookie()
        .map((c) => c.split(';')[0])
        .join('; '),
    });
  }
  const [a, b] = identities;
  const empty = await getHome(a.id, {}, { now: at('12:00') });
  assert.equal(empty.nextAction, null);
  assert.equal(empty.emptyMessage, '此刻，可以留白。');
  pass('HOME-009 empty state has no invented tasks');
  const fixture = await seedHome(a.id, '2026-10-16'),
    other = await seedHome(b.id, '2026-10-16');
  const business = async () =>
    JSON.stringify(
      await databaseClient`select id,version,status,planned_start,planned_end,due_at from tasks where owner_id=${a.id} order by id`,
    );
  phase = 'HOME-001/002';
  const original = await business();
  const [tables] =
    await databaseClient`select count(*)::int as n from pg_tables where schemaname='public' and (tablename like 'home_%' or tablename like 'attention_%')`;
  assert.equal(tables.n, 0);
  assert.equal(
    (await tasks.getTask(a.id, { id: fixture.taskIds.math })).sourceId,
    fixture.assignmentId,
  );
  pass(phase + ' real providers and authoritative domain identities');
  phase = 'HOME-003/004';
  const morning = await getHome(a.id, {}, { now: at('09:10') }),
    current = await getHome(a.id, {}, { now: at('14:20') });
  assert.equal(morning.nextAction?.title, '高等数学');
  assert.equal(morning.currentContext?.state, 'UPCOMING');
  assert.equal(morning.statusSnapshot?.energy, 3);
  assert.equal(current.nextAction?.title, '计算机思维与人工智能基础');
  assert.equal(current.currentContext?.state, 'CURRENT');
  assert.equal(current.statusSnapshot?.energy, 2);
  pass(phase + ' actual upcoming and in-progress ClassSessions');
  phase = 'HOME-005/006';
  const afternoon = await getHome(a.id, {}, { now: at('16:10') });
  assert.equal(afternoon.nextAction?.sourceRef.id, fixture.taskIds.parcel);
  const evening = await getHome(a.id, {}, { now: at('20:30') });
  assert.equal(evening.nextAction?.sourceRef.id, fixture.taskIds.math);
  assert.equal(evening.nextAction?.reason, '今晚截止，预计35分钟。');
  pass(phase + ' short planned task and hard evening deadline');
  phase = 'HOME-016';
  assert.equal(await business(), original);
  pass(phase + ' engine and aggregator perform no task mutation');
  phase = 'HOME-007';
  await tasks.completeTask(a.id, {
    id: fixture.taskIds.parcel,
    version: afternoon.nextAction!.sourceRef.version,
  });
  const after = await getHome(a.id, {}, { now: at('16:10') });
  assert.equal(after.nextAction?.sourceRef.id, fixture.taskIds.math);
  const finalEvening = await getHome(a.id, {}, { now: at('20:30') });
  assert.equal(finalEvening.fallbackAction?.title, '英语阅读');
  pass(phase + ' completion immediately recalculates');
  phase = 'HOME-008';
  await status.createRecord(a.id, {
    recordedAt: at('20:00').toISOString(),
    energy: 1,
  });
  assert.equal(
    (await getHome(a.id, {}, { now: at('20:30') })).nextAction?.sourceRef.id,
    fixture.taskIds.math,
  );
  pass(phase + ' low energy cannot hide hard urgency');
  phase = 'HOME-012';
  await status.createRecord(a.id, {
    recordedAt: at('20:10').toISOString(),
    energy: 5,
    customMood: 'HIGH_SECRET',
    mood: 'OTHER',
    privacyLevel: 'HIGH_PRIVATE',
  });
  await cycle.createRecord(a.id, {
    startDate: '2026-10-16',
    note: 'CYCLE_SECRET',
  });
  const safe = await getHome(a.id, {}, { now: at('20:30') });
  assert.equal(safe.statusSnapshot?.energy, 1);
  assert.ok(!JSON.stringify(safe).includes('HIGH_SECRET'));
  assert.ok(!JSON.stringify(safe).includes('CYCLE_SECRET'));
  assert.ok(!JSON.stringify(safe).includes(other.taskIds.math));
  const aiSafe = await getHome(
    a.id,
    {},
    { now: at('20:30'), audience: 'MODEL' },
  );
  assert.equal(aiSafe.statusSnapshot, null);
  pass(
    phase +
      ' HIGH_PRIVATE/Cycle excluded and model audience respects EXPLICIT_ONLY',
  );
  phase = 'HOME-013/014';
  process.env.DEV_NOW = at('20:30').toISOString();
  const chat = await createConversation(a.id);
  let calls = 0;
  const turnInput = {
    conversationId: chat.id,
    requestId: randomUUID(),
    content: '我现在干嘛？',
    sourceRoute: '/app',
  };
  const turn = await sendTurn(a.id, turnInput, {
    async propose() {
      calls++;
      throw new Error('No model should be called');
    },
  });
  assert.equal(calls, 0);
  assert.equal(turn.status, 'SUCCESS');
  assert.equal(turn.reply, attentionReply(safe));
  const trace = await getTrace(a.id, { id: turn.id });
  assert.ok((trace?.refs.length ?? 0) <= 2);
  assert.equal(trace?.intent, 'LOCAL_ATTENTION_QUERY');
  assert.deepEqual(turn.result?.createdEntities, []);
  assert.deepEqual(turn.result?.updatedEntities, []);
  const retry = await sendTurn(a.id, turnInput);
  assert.equal(retry.id, turn.id);
  pass(phase + ' Lim uses exactly the same primary/fallback without a model');
  const alternateZone='America/Los_Angeles',alternateHome=await getHome(a.id,{timeZone:alternateZone},{now:at('20:30')});
  const alternateTurn=await sendTurn(a.id,{...turnInput,requestId:randomUUID(),timeZone:alternateZone},{async propose(){throw new Error('No model');}});
  assert.equal(alternateTurn.reply,attentionReply(alternateHome));pass('HOME and Lim share the caller time zone, including local date/night rules');
  phase = 'HOME-015';
  assert.ok(
    !JSON.stringify(safe).match(/score|coefficient|priority|importance/i),
  );
  assert.ok(!turn.reply.match(/score|coefficient|priority/i));
  pass(phase + ' no fake public numeric ranking');
  phase = 'submission freshness';
  const math = await tasks.getTask(a.id, { id: fixture.taskIds.math });
  await tasks.completeTask(a.id, { id: math.id, version: math.version });
  const pending = await getHome(a.id, {}, { now: at('20:30') });
  assert.equal(pending.nextAction?.sourceRef.type, 'ASSIGNMENT');
  assert.equal(pending.nextAction?.suggestedAction, 'SUBMIT_ASSIGNMENT');
  assert.equal(
    (await academic.getRecord(a.id, { id: fixture.assignmentId }))
      .submissionState,
    'NOT_SUBMITTED',
  );
  await dispatchPendingEvents(
    new Map([['TaskCompleted', handleTaskCompleted]]),
    100,
  );
  const assignment = await academic.getRecord(a.id, {
    id: fixture.assignmentId,
  });
  await academic.markAssignmentSubmitted(a.id, {
    id: assignment.id,
    version: assignment.version,
  });
  pass(phase + ' no repeat work or false submission while Outbox catches up');
  phase = 'HOME-010/011';
  const quiet = await getHome(a.id, {}, { now: at('00:40', '2026-10-17') });
  assert.equal(quiet.nextAction, null);
  assert.equal(quiet.emptyMessage, '今晚没有必须处理的事。');
  const urgent = await tasks.createTask(a.id, {
    title: '凌晨硬截止',
    dueAt: at('01:00', '2026-10-17').toISOString(),
  });
  assert.equal(
    (await getHome(a.id, {}, { now: at('00:40', '2026-10-17') })).nextAction
      ?.sourceRef.id,
    urgent.id,
  );
  pass(phase + ' quiet late night never hides true hard deadlines');
  phase = 'HOME-017';
  for (const clock of ['09:10', '14:20', '16:10', '20:30', '00:40']) {
    process.env.DEV_NOW = at(clock).toISOString();
    assert.equal((await getHome(a.id)).asOf, at(clock).toISOString());
  }
  const actual = at('12:00');
  assert.equal(
    selectClockNow(
      { APP_ENV: 'production', DEV_NOW: at('09:10').toISOString() },
      actual,
    ),
    actual,
  );
  pass(phase + ' deterministic existing dev clock and production isolation');
  phase = 'HTTP authorization';
  assert.equal((await request('/home')).status, 401);
  assert.equal(
    (await request('/home?now=2026-10-16T00%3A00%3A00Z', a)).status,
    400,
  );
  assert.equal((await request('/home?ownerId=' + b.id, a)).status, 400);
  const response = await request('/home', a);
  assert.equal(response.status, 200);
  assert.ok(!(await response.text()).includes(other.taskIds.math));
  pass(phase + ' owner from server identity and no HTTP clock controls');
  phase = 'seed idempotence';
  const beforeRepeat = await business();
  await seedHome(a.id, '2026-10-16');
  assert.equal(await business(), beforeRepeat);
  assert.equal(
    (await tasks.getTask(a.id, { id: fixture.taskIds.parcel })).status,
    'COMPLETED',
  );
  pass(
    phase + ' explicit fixture import preserves completed work and user edits',
  );
  console.log('HOME-001–017 and additional real domain/privacy checks passed.');
} catch (e) {
  console.error(
    'FAIL Home at ' +
      phase +
      '; ' +
      (e instanceof Error ? e.name : 'UnknownError'),
  );
  const x = e as { actual?: unknown; expected?: unknown; stack?: string };
  const safe = (v: unknown) =>
    typeof v === 'number' ||
    (typeof v === 'string' &&
      /^(?:SUCCESS|FAILED|TASK|CLASS|ASSIGNMENT|CURRENT|UPCOMING|LOCAL_ATTENTION_QUERY|\d{4}-\d\d-\d\dT[0-9:.+Z-]+)$/.test(
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
        .find((l) => l.includes('verify-home.ts'))
        ?.trim(),
    }),
  );
  process.exitCode = 1;
} finally {
  for (const a of identities) {
    assert.ok(
      a.email.startsWith('home-verification-') &&
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
