import { pathToFileURL } from 'node:url';
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { rawDb, databaseClient } from '../src/db';
import { users } from '../src/resources/users/users.schema';
import { semesters } from '../src/resources/semesters/semesters.schema';
import { courses } from '../src/resources/courses/courses.schema';
import { classSessions } from '../src/resources/class-sessions/class-sessions.schema';
import { assignments } from '../src/resources/assignments/assignments.schema';
import { tasks } from '../src/resources/tasks/tasks.schema';
import { projects } from '../src/resources/projects/projects.schema';
import { statusMoments } from '../src/resources/status-moments/status-moments.schema';
import * as semesterMethods from '../src/resources/semesters/methods';
import * as courseMethods from '../src/resources/courses/methods';
import * as sessionMethods from '../src/resources/class-sessions/methods';
import * as academic from '../src/resources/assignments/methods';
import * as taskMethods from '../src/resources/tasks/methods';
import * as projectMethods from '../src/resources/projects/methods';
import * as statusMethods from '../src/resources/status-moments/methods';
import { ensureCurrent } from '../src/resources/voyages/methods';
import { selectClockNow } from '../src/resources/core-clock';
import { seedId } from './seed-core';
import fixtures from './home-fixtures.json';
export async function seedHome(
  ownerId: string,
  day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(
    selectClockNow(process.env),
  ),
) {
  if (process.env.APP_ENV !== 'development')
    throw new Error('Development fixtures only');
  z.string().date().parse(day);
  const [owner] = await rawDb
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, ownerId));
  if (!owner) throw new Error('Existing local account required');
  const voyage = await ensureCurrent(ownerId, {}),
    id = (key: string) => seedId(ownerId, 'attention-v1:' + key),
    at = (time: string) =>
      new Date(day + 'T' + time + ':00+08:00').toISOString();
  const exists = async (
    table:
      | typeof semesters
      | typeof courses
      | typeof classSessions
      | typeof assignments
      | typeof tasks
      | typeof statusMoments
      | typeof projects,
    key: string,
  ) =>
    (
      await rawDb
        .select({ id: table.id })
        .from(table)
        .where(and(eq(table.ownerId, ownerId), eq(table.id, id(key))))
    )[0];
  const semesterId = id('semester');
  if (!(await exists(semesters, 'semester')))
    await semesterMethods.createRecord(
      ownerId,
      {
        voyageId: voyage.id,
        name: 'STANDARD DAY · 大学',
        startAt: day.slice(0, 4) + '-01-01T00:00:00+08:00',
        endAt: day.slice(0, 4) + '-12-31T23:59:00+08:00',
      },
      semesterId,
    );
  const courseIds: Record<string, string> = {},
    taskIds: Record<string, string> = {};
  for (const c of fixtures.courses) {
    const key = 'course-' + c.key;
    courseIds[c.key] = id(key);
    if (!(await exists(courses, key)))
      await courseMethods.createRecord(
        ownerId,
        { semesterId, name: c.name },
        id(key),
      );
  }
  for (const s of fixtures.sessions) {
    const key = 'session-' + s.key;
    if (!(await exists(classSessions, key)))
      await sessionMethods.createRecord(
        ownerId,
        {
          courseId: courseIds[s.courseKey],
          specificDate: day,
          startTime: s.start,
          endTime: s.end,
          timeZone: 'Asia/Shanghai',
        },
        id(key),
      );
  }
  const [existingProject] = await rawDb
    .select({ id: projects.id })
    .from(projects)
    .where(
      and(
        eq(projects.ownerId, ownerId),
        eq(projects.title, 'LIFE HUD · Project #001'),
      ),
    )
    .limit(1);
  const projectId = existingProject?.id ?? id('project');
  if (!existingProject && !(await exists(projects, 'project')))
    await projectMethods.createRecord(
      ownerId,
      { title: 'LIFE HUD · Project #001', voyageId: voyage.id },
      projectId,
    );
  let assignmentId = '';
  for (const t of fixtures.tasks) {
    if (t.assignmentCourseKey) {
      const key = 'assignment-' + t.key;
      assignmentId = id(key);
      const prior = await exists(assignments, key);
      if (!prior) {
        const created = await academic.createRecord(
          ownerId,
          {
            courseId: courseIds[t.assignmentCourseKey],
            title: t.title,
            dueAt: at(t.dueTime!),
            estimatedMinutes: t.estimatedMinutes,
          },
          assignmentId,
        );
        if (created.taskId)
          await taskMethods.updateTask(ownerId, {
            id: created.taskId,
            version: 1,
            title: t.title,
            plannedStart: at(t.plannedTime!),
            importance: t.importance,
          });
      }
      const [row] = await rawDb
        .select({ taskId: assignments.taskId })
        .from(assignments)
        .where(and(eq(assignments.ownerId, ownerId), eq(assignments.id, assignmentId)));
      if (row?.taskId) taskIds[t.key] = row.taskId;
    } else {
      const key = 'task-' + t.key;
      taskIds[t.key] = id(key);
      if (!(await exists(tasks, key)))
        await taskMethods.createTask(
          ownerId,
          {
            title: t.title,
            plannedStart: t.plannedTime ? at(t.plannedTime) : null,
            dueAt: t.dueTime ? at(t.dueTime) : null,
            estimatedMinutes: t.estimatedMinutes,
            importance: t.importance,
            projectId: t.key === 'architecture' ? projectId : null,
          },
          { trustedId: id(key) },
        );
    }
  }
  for (const s of fixtures.status) {
    const key = 'status-' + s.key;
    if (!(await exists(statusMoments, key)))
      await statusMethods.createRecord(
        ownerId,
        { recordedAt: at(s.time), mood: s.mood, energy: s.energy },
        id(key),
      );
  }
  return {
    day,
    voyageId: voyage.id,
    semesterId,
    courseIds,
    taskIds,
    assignmentId,
    projectId,
  };
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    const index = process.argv.indexOf('--email'),
      dateIndex = process.argv.indexOf('--date');
    if (index < 0 || !process.argv[index + 1])
      throw new Error('Existing local account required');
    const [owner] = await rawDb
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, process.argv[index + 1].toLowerCase()));
    if (!owner) throw new Error('Account not found');
    await seedHome(
      owner.id,
      dateIndex < 0 ? undefined : process.argv[dateIndex + 1],
    );
    console.log(
      'STANDARD_DAY fixtures saved; existing records and edits preserved.',
    );
  } catch {
    console.error(
      'Home seed failed; select an existing account and valid development date.',
    );
    process.exitCode = 1;
  } finally {
    await databaseClient.end({ timeout: 2 });
  }
}
