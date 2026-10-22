import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import { databaseClient, rawDb } from '../src/db';
import { eq } from 'drizzle-orm';
import { files } from '../src/resources/files/files.schema';
import { outboxEvents } from '../src/resources/outbox-events/outbox-events.schema';
import { dispatchPendingEvents } from '../src/resources/outbox-events/methods';
import { handleTaskCompleted } from '../src/resources/assignments/handlers/task-completed';
import { getStudy } from '../src/resources/study/methods';
import { seedUniversity } from './seed-university';
import type { getRecord } from '../src/resources/assignments/methods';
import type { getTask } from '../src/resources/tasks/methods';
type Assignment = Awaited<ReturnType<typeof getRecord>>;
type Task = Awaited<ReturnType<typeof getTask>>;
type Row = { id: string; version: number };
type Account = { id: string; email: string; cookie: string };
const accounts: Account[] = [],
  objects: string[] = [];
const base = process.env.API_URL!,
  origin = process.env.WEB_URL!;
let phase = 'readiness';
async function request(
  path: string,
  a?: Account,
  body?: unknown,
  method = body ? 'POST' : 'GET',
  retry = false,
): Promise<Response> {
  const r = await fetch(base + path, {
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
  if (r.status === 429 && !retry) {
    const delay = Number(
      r.headers.get('retry-after') || r.headers.get('x-retry-after'),
    );
    if (delay > 0 && delay <= 10) {
      await r.body?.cancel();
      await new Promise((r) => setTimeout(r, delay * 1000 + 250));
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
  assert.equal(r.status, 200, phase + ' HTTP status');
  return (await r.json()) as T;
}
const pass = (n: string) => console.log('PASS ' + n);
try {
  for (const suffix of ['a', 'b']) {
    const email =
      'university-verification-' + randomUUID() + suffix + '@local.invalid';
    const r = await request('/api/auth/sign-up/email', undefined, {
      email,
      password: randomBytes(24).toString('base64url'),
      name: 'University verification',
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
  phase = 'UNI-001';
  const voyage = await read('/voyages/ensure-current', a, {});
  const semester = await read('/semesters', a, {
    voyageId: voyage.id,
    name: '大一上',
    startAt: '2026-09-01T00:00:00+08:00',
    endAt: '2027-01-31T23:59:00+08:00',
  });
  pass('UNI-001 Semester under active University Voyage');
  phase = 'UNI-002';
  const course = await read('/courses', a, {
    semesterId: semester.id,
    name: '高等数学',
  });
  pass('UNI-002 Course persisted');
  const enrollment = await read('/enrollments', a, { courseId: course.id });
  phase = 'UNI-003';
  let assignment = await read<Assignment>('/assignments', a, {
    courseId: course.id,
    title: '第三章作业',
    dueAt: '2026-10-16T23:59:00+08:00',
  });
  pass('UNI-003 Assignment persisted');
  phase = 'UNI-004';
  let task = await read<Task>('/tasks/' + assignment.taskId, a);
  assert.equal(task.sourceId, assignment.id);
  assert.equal(task.sourceType, 'ASSIGNMENT');
  const tasks = await read<Task[]>('/tasks', a);
  assert.equal(tasks.filter((t) => t.sourceId === assignment.id).length, 1);
  pass('UNI-004 one linked Core Task');
  assert.notEqual(assignment.id, task.id);
  pass('UNI-005 distinct rows and IDs');
  assert.equal(task.dueAt, assignment.dueAt);
  pass('UNI-006 initial hard deadline follows Assignment');
  task = await read<Task>(
    '/tasks/' + task.id,
    a,
    {
      id: task.id,
      version: task.version,
      plannedStart: '2026-10-15T19:00:00+08:00',
    },
    'PUT',
  );
  task = await read<Task>('/tasks/' + task.id + '/delay', a, {
    id: task.id,
    version: task.version,
    plannedStart: '2026-10-15T21:00:00+08:00',
  });
  assert.equal(
    (await read<Assignment>('/assignments/' + assignment.id, a)).dueAt,
    assignment.dueAt,
  );
  pass('UNI-009 Task delay preserves academic deadline');
  assignment = await read<Assignment>(
    '/assignments/' + assignment.id,
    a,
    {
      id: assignment.id,
      version: assignment.version,
      dueAt: '2026-10-19T23:59:00+08:00',
    },
    'PUT',
  );
  task = await read<Task>('/tasks/' + task.id, a);
  assert.equal(task.dueAt, assignment.dueAt);
  pass('UNI-007 Assignment deadline synchronized');
  assert.equal(
    task.plannedStart,
    new Date('2026-10-15T21:00:00+08:00').toISOString(),
  );
  pass('UNI-008 execution plan preserved');
  assert.equal(
    (
      await request(
        '/tasks/' + task.id,
        a,
        { id: task.id, version: task.version, dueAt: null },
        'PUT',
      )
    ).status,
    400,
  );
  pass('Task cannot override academic source deadline');
  task = await read<Task>('/tasks/' + task.id + '/complete', a, {
    id: task.id,
    version: task.version,
  });
  await dispatchPendingEvents(
    new Map([['TaskCompleted', handleTaskCompleted]]),
    100,
  );
  assignment = await read<Assignment>('/assignments/' + assignment.id, a);
  assert.equal(assignment.workState, 'DONE');
  pass('UNI-010 TaskCompleted handler marks work DONE');
  assert.equal(assignment.submissionState, 'NOT_SUBMITTED');
  assert.equal(assignment.submittedAt, null);
  pass('UNI-011 DONE remains NOT_SUBMITTED');
  assignment = await read<Assignment>(
    '/assignments/' + assignment.id + '/submit',
    a,
    { id: assignment.id, version: assignment.version },
  );
  assert.equal(assignment.submissionState, 'SUBMITTED');
  assert.ok(assignment.submittedAt);
  pass('UNI-012 explicit submission persisted');
  const count = (await read<Task[]>('/tasks', a)).length;
  const exam = await read('/exams', a, {
    courseId: course.id,
    title: '高等数学期中考试',
    startAt: '2026-10-30T09:00:00+08:00',
  });
  assert.equal((await read<Task[]>('/tasks', a)).length, count);
  pass('UNI-013 Exam creates no revision Tasks');
  phase = 'UNI-014';
  const form = new FormData();
  form.set(
    'file',
    new File(['University material fixture'], 'chapter.txt', {
      type: 'text/plain',
    }),
  );
  const file = await read<{ fileId: string; key: string }>(
    '/files/upload',
    a,
    form,
  );
  objects.push(file.key);
  const material = await read('/course-material-links', a, {
    courseId: course.id,
    fileId: file.fileId,
    label: '第三章讲义',
  });
  const metadata = await rawDb
    .select()
    .from(files)
    .where(eq(files.ownerId, a.id));
  assert.equal(metadata.length, 1);
  assert.equal(metadata[0].id, file.fileId);
  const downloaded = await read<{ url: string }>(
    '/files/' + file.fileId + '/download',
    a,
  );
  assert.equal(
    await (await fetch(downloaded.url)).text(),
    'University material fixture',
  );
  assert.equal(
    (await request('/files/remove', a, { key: file.key, confirm: true }))
      .status,
    409,
  );
  pass('UNI-014 material references one Core File; linked storage protected');
  const place = await read('/places', a, { name: '教学楼 A101' });
  const session = await read('/class-sessions', a, {
    courseId: course.id,
    placeId: place.id,
    specificDate: '2026-10-16',
    startTime: '09:50',
    endTime: '11:25',
  });
  const grade = await read('/grades', a, {
    courseId: course.id,
    score: 88,
    maxScore: 100,
    recordedAt: '2026-10-16T12:00:00+08:00',
  });
  phase = 'UNI-015';
  for (const [resource, row] of [
    ['semesters', semester],
    ['courses', course],
    ['enrollments', enrollment],
    ['class-sessions', session],
    ['assignments', assignment],
    ['exams', exam],
    ['grades', grade],
    ['course-material-links', material],
    ['places', place],
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
  assert.equal(
    (await request('/files/' + file.fileId + '/download', b)).status,
    404,
  );
  assert.equal(
    (
      await request('/assignments/' + assignment.id + '/submit', b, {
        id: assignment.id,
        version: assignment.version,
      })
    ).status,
    404,
  );
  assert.equal(
    (
      await request('/assignments', b, {
        courseId: course.id,
        title: 'foreign',
      })
    ).status,
    404,
  );
  assert.equal(
    (
      await request('/course-material-links', b, {
        courseId: course.id,
        fileId: file.fileId,
      })
    ).status,
    404,
  );
  pass(
    'UNI-015 all resources owner scoped; reads/writes/foreign references hidden',
  );
  phase = 'UNI-016';
  const during = await getStudy(a.id, new Date('2026-10-16T02:00:00Z'));
  assert.equal(during.today[0].id, session.id);
  assert.equal(during.today[0].courseName, '高等数学');
  pass('UNI-016 Study Today uses persisted ClassSession');
  const before = await getStudy(a.id, new Date('2026-10-16T01:00:00Z')),
    after = await getStudy(a.id, new Date('2026-10-16T03:25:00Z'));
  assert.equal(before.next?.id, session.id);
  assert.equal(before.current, null);
  assert.equal(during.current?.id, session.id);
  assert.equal(after.current, null);
  pass('UNI-017 Home current/next shares real deterministic Study context');
  phase = 'version and failure checks';
  assert.equal(
    (
      await request(
        '/assignments/' + assignment.id,
        a,
        { id: assignment.id, version: 1, title: 'stale' },
        'PUT',
      )
    ).status,
    409,
  );
  assert.equal(
    (
      await request('/class-sessions', a, {
        courseId: course.id,
        specificDate: '2026-10-16',
        startTime: '12:00',
        endTime: '09:00',
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await request('/grades', a, {
        courseId: course.id,
        score: 101,
        maxScore: 100,
        recordedAt: '2026-10-16T12:00:00Z',
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await request('/assignments', undefined, {
        courseId: course.id,
        title: 'anonymous',
      })
    ).status,
    401,
  );
  const suppressed = await read<Assignment>('/assignments', a, {
    courseId: course.id,
    title: '仅记录',
    createTask: false,
  });
  assert.equal(suppressed.taskId, null);
  pass(
    'optimistic conflicts, field validation, anonymous rejection, explicit Task suppression',
  );
  const audit =
    await databaseClient`select action from audit_logs where owner_id=${a.id} and entity_id=${assignment.id}`;
  for (const action of [
    'AssignmentCreated',
    'AssignmentUpdated',
    'AssignmentCompleted',
    'AssignmentSubmitted',
  ])
    assert.ok(audit.some((r) => r.action === action));
  pass('meaningful Assignment Audit and Outbox');
  // Duplicate and stale completion delivery must not create additional transitions.
  const event = (
    await rawDb
      .select()
      .from(outboxEvents)
      .where(eq(outboxEvents.entityId, task.id))
  ).find((e) => e.eventType === 'TaskCompleted');
  assert.ok(event);
  const version = assignment.version;
  await rawDb.transaction((tx) => handleTaskCompleted(event, tx));
  assert.equal(
    (await read<Assignment>('/assignments/' + assignment.id, a)).version,
    version,
  );
  task = await read<Task>('/tasks/' + task.id + '/reopen', a, {
    id: task.id,
    version: task.version,
  });
  assignment = await read<Assignment>(
    '/assignments/' + assignment.id,
    a,
    {
      id: assignment.id,
      version: assignment.version,
      workState: 'IN_PROGRESS',
    },
    'PUT',
  );
  await rawDb.transaction((tx) => handleTaskCompleted(event, tx));
  assert.equal(
    (await read<Assignment>('/assignments/' + assignment.id, a)).workState,
    'IN_PROGRESS',
  );
  pass('duplicate event idempotency and stale completion after reopen');
  phase = 'explicit work correction wins over delayed completion';
  task = await read<Task>('/tasks/' + task.id + '/complete', a, {
    id: task.id,
    version: task.version,
  });
  for (let attempt = 0; attempt < 2; attempt++) {
    assignment = await read<Assignment>('/assignments/' + assignment.id, a);
    const r = await request(
      '/assignments/' + assignment.id,
      a,
      {
        id: assignment.id,
        version: assignment.version,
        workState: 'IN_PROGRESS',
      },
      'PUT',
    );
    if (r.status === 409 && attempt === 0) continue;
    assert.equal(r.status, 200);
    assignment = (await r.json()) as Assignment;
    break;
  }
  const completion = (
    await rawDb
      .select()
      .from(outboxEvents)
      .where(eq(outboxEvents.entityId, task.id))
  )
    .filter((e) => e.eventType === 'TaskCompleted')
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
  assert.ok(completion);
  await rawDb.transaction((tx) => handleTaskCompleted(completion, tx));
  assert.equal(
    (await read<Assignment>('/assignments/' + assignment.id, a)).workState,
    'IN_PROGRESS',
  );
  pass('explicit later work-state correction wins over delayed event');
  phase = 'soft-deleted relationships can be re-created';
  const removed = await read(
    '/course-material-links/' + material.id,
    a,
    { id: material.id, version: material.version, confirm: true },
    'DELETE',
  );
  assert.ok(removed.id);
  const relink = await read('/course-material-links', a, {
    courseId: course.id,
    fileId: file.fileId,
  });
  assert.notEqual(relink.id, material.id);
  assert.equal(
    (
      await request('/course-material-links', a, {
        courseId: course.id,
        fileId: file.fileId,
      })
    ).status,
    409,
  );
  pass('material unlink/relink retains one active reference');
  const academicEvents =
    await databaseClient`select event_type from outbox_events where owner_id=${a.id} and entity_type in ('SEMESTER','COURSE','ENROLLMENT','CLASS_SESSION','GRADE','COURSE_MATERIAL_LINK','PLACE')`;
  assert.equal(academicEvents.length, 0);
  pass('routine University edits do not create unused Outbox event families');
  phase = 'development seed';
  const seed = await seedUniversity(a.id, '2026-10-16');
  const seeded = await read<Assignment>('/assignments/' + seed.assignmentId, a);
  const beforeSeed = (await read<Task[]>('/tasks', a)).length;
  await seedUniversity(a.id, '2026-10-16');
  assert.equal((await read<Task[]>('/tasks', a)).length, beforeSeed);
  assert.equal(
    (await read<Assignment>('/assignments/' + seed.assignmentId, a)).version,
    seeded.version,
  );
  pass('explicit idempotent development seed preserves existing records');
  console.log('University domain acceptance passed.');
} catch (e) {
  console.error(
    'FAIL University at ' +
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
  for (const key of objects) {
    const a = accounts[0];
    if (a) {
      const links =
        await databaseClient`select id,version from course_material_links where owner_id=${a.id} and deleted_at is null`;
      for (const link of links)
        await request(
          '/course-material-links/' + link.id,
          a,
          { id: link.id, version: link.version, confirm: true },
          'DELETE',
        );
      assert.equal((await request('/files/remove', a, { key, confirm: true })).status,200);
    }
  }
  for (const a of accounts) {
    assert.ok(
      a.email.startsWith('university-verification-') &&
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
