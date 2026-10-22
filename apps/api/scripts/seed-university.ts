import { pathToFileURL } from 'node:url';
import { and, eq } from 'drizzle-orm';
import { rawDb, databaseClient } from '../src/db';
import { users } from '../src/resources/users/users.schema';
import { semesters } from '../src/resources/semesters/semesters.schema';
import { courses } from '../src/resources/courses/courses.schema';
import { enrollments } from '../src/resources/enrollments/enrollments.schema';
import { classSessions } from '../src/resources/class-sessions/class-sessions.schema';
import { assignments } from '../src/resources/assignments/assignments.schema';
import { exams } from '../src/resources/exams/exams.schema';
import { places } from '../src/resources/places/places.schema';
import * as semesterMethods from '../src/resources/semesters/methods';
import * as courseMethods from '../src/resources/courses/methods';
import * as enrollmentMethods from '../src/resources/enrollments/methods';
import * as sessionMethods from '../src/resources/class-sessions/methods';
import * as assignmentMethods from '../src/resources/assignments/methods';
import * as examMethods from '../src/resources/exams/methods';
import * as placeMethods from '../src/resources/places/methods';
import { ensureCurrent } from '../src/resources/voyages/methods';
import { seedId } from './seed-core';
import { selectClockNow } from '../src/resources/core-clock';
import fixtures from './university-fixtures.json';
export async function seedUniversity(
  ownerId: string,
  day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(
    selectClockNow(process.env),
  ),
) {
  if (process.env.APP_ENV !== 'development')
    throw new Error('Development fixtures only');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || Number.isNaN(Date.parse(day)))
    throw new Error('Invalid fixture date');
  const [owner] = await rawDb
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, ownerId));
  if (!owner) throw new Error('Select existing account');
  const voyage = await ensureCurrent(ownerId, {});
  const id = (key: string) => seedId(ownerId, 'university-v1:' + key);
  const ensure = async (
    table:
      | typeof semesters
      | typeof courses
      | typeof enrollments
      | typeof classSessions
      | typeof assignments
      | typeof exams
      | typeof places,
    key: string,
    create: (
      owner: string,
      input: unknown,
      trustedId?: string,
    ) => Promise<unknown>,
    input: unknown,
  ) => {
    const recordId = id(key);
    const [exists] = await rawDb
      .select({ id: table.id })
      .from(table)
      .where(and(eq(table.id, recordId), eq(table.ownerId, ownerId)));
    if (!exists) await create(ownerId, input, recordId);
    return recordId;
  };
  const year = Number(day.slice(0, 4));
  const semesterId = await ensure(
    semesters,
    'semester',
    semesterMethods.createRecord,
    {
      voyageId: voyage.id,
      name: '大一上 · Semester 1',
      startAt: `${year}-09-01T00:00:00+08:00`,
      endAt: `${year + 1}-01-31T23:59:00+08:00`,
    },
  );
  const courseIds: Record<string, string> = {};
  for (const c of fixtures.courses) {
    courseIds[c.key] = await ensure(
      courses,
      'course-' + c.key,
      courseMethods.createRecord,
      { semesterId, name: c.name, code: c.code, teacher: c.teacher },
    );
    await ensure(
      enrollments,
      'enrollment-' + c.key,
      enrollmentMethods.createRecord,
      { courseId: courseIds[c.key] },
    );
  }
  for (const s of fixtures.sessions) {
    const placeId = await ensure(
      places,
      'place-' + s.key,
      placeMethods.createRecord,
      { name: s.placeName },
    );
    const date = new Date(day + 'T00:00:00Z');
    date.setUTCDate(date.getUTCDate() + s.dayOffset);
    await ensure(
      classSessions,
      'session-' + s.key,
      sessionMethods.createRecord,
      {
        courseId: courseIds[s.courseKey],
        placeId,
        specificDate: date.toISOString().slice(0, 10),
        startTime: s.startTime,
        endTime: s.endTime,
      },
    );
  }
  const assignmentId = await ensure(
    assignments,
    'assignment',
    assignmentMethods.createRecord,
    {
      courseId: courseIds.math,
      title: '高等数学 · 第三章作业',
      dueAt: day + 'T23:59:00+08:00',
      estimatedMinutes: 35,
    },
  );
  const examDay = new Date(day + 'T00:00:00Z');
  examDay.setUTCDate(examDay.getUTCDate() + 14);
  await ensure(exams, 'exam', examMethods.createRecord, {
    courseId: courseIds.math,
    title: '高等数学期中考试',
    startAt: examDay.toISOString().slice(0, 10) + 'T09:00:00+08:00',
  });
  return { semesterId, courseIds, assignmentId };
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    const email = process.argv[process.argv.indexOf('--email') + 1];
    if (!process.argv.includes('--email') || !email)
      throw new Error('Existing account required');
    const [owner] = await rawDb
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email.toLowerCase()));
    if (!owner) throw new Error('Account missing');
    const at = process.argv.indexOf('--date');
    await seedUniversity(owner.id, at >= 0 ? process.argv[at + 1] : undefined);
    console.log(
      'University development fixtures saved. Existing records preserved.',
    );
  } catch {
    console.error(
      'University seed failed; select an existing local account and a valid development date.',
    );
    process.exitCode = 1;
  } finally {
    await databaseClient.end({ timeout: 2 });
  }
}
