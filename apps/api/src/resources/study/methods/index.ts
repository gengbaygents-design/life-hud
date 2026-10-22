import { recordSchema } from '../contract';
import { rawDb } from '@/db';
import { and, eq, isNull } from 'drizzle-orm';
import { semesters } from '../../semesters/semesters.schema';
import { courses } from '../../courses/courses.schema';
import { classSessions } from '../../class-sessions/class-sessions.schema';
import { assignments } from '../../assignments/assignments.schema';
import { enrollments } from '../../enrollments/enrollments.schema';
import { exams } from '../../exams/exams.schema';
import { grades } from '../../grades/grades.schema';
import { courseMaterialLinks } from '../../course-material-links/course-material-links.schema';
import { places } from '../../places/places.schema';
import { files } from '../../files/files.schema';
import { voyages } from '../../voyages/voyages.schema';
import { toWire } from '../../core-methods';
import {
  selectClasses,
  selectClockNow,
} from '../../class-sessions/methods/timetable';
export async function getStudy(
  ownerId: string,
  now = selectClockNow(process.env),
) {
  const data = await rawDb.transaction(
    async (tx) => {
      const scope = (
        t:
          | typeof courses
          | typeof semesters
          | typeof classSessions
          | typeof assignments
          | typeof exams
          | typeof grades
          | typeof courseMaterialLinks
          | typeof places
          | typeof files
          | typeof enrollments,
      ) => and(eq(t.ownerId, ownerId), isNull(t.deletedAt));
      return {
        semesters: (
          await tx.select().from(semesters).where(scope(semesters))
        ).map(toWire),
        courses: (await tx.select().from(courses).where(scope(courses))).map(
          toWire,
        ),
        enrollments: (
          await tx.select().from(enrollments).where(scope(enrollments))
        ).map(toWire),
        sessions: (
          await tx.select().from(classSessions).where(scope(classSessions))
        ).map(toWire),
        assignments: (
          await tx.select().from(assignments).where(scope(assignments))
        ).map(toWire),
        exams: (await tx.select().from(exams).where(scope(exams))).map(toWire),
        grades: (await tx.select().from(grades).where(scope(grades))).map(
          toWire,
        ),
        materials: (
          await tx
            .select()
            .from(courseMaterialLinks)
            .where(scope(courseMaterialLinks))
        ).map(toWire),
        places: (await tx.select().from(places).where(scope(places))).map(
          toWire,
        ),
        files: (await tx.select().from(files).where(scope(files))).map(toWire),
        voyages: await tx
          .select()
          .from(voyages)
          .where(
            and(
              eq(voyages.ownerId, ownerId),
              isNull(voyages.deletedAt),
              eq(voyages.status, 'ACTIVE'),
            ),
          ),
      };
    },
    { isolationLevel: 'repeatable read', accessMode: 'read only' },
  );
  const activeSemesters = new Set(
    data.semesters
      .filter(
        (s) =>
          s.status === 'ACTIVE' &&
          data.voyages.some(
            (v) => v.id === s.voyageId && v.voyageType === 'UNIVERSITY',
          ),
      )
      .map((s) => s.id),
  );
  const coursesById = new Map(data.courses.map((c) => [c.id, c]));
  const sessions = data.sessions
    .filter((s) => coursesById.has(s.courseId))
    .map((s) => ({
      ...s,
      courseName: coursesById.get(s.courseId)!.name,
      placeName: data.places.find((p) => p.id === s.placeId)?.name ?? null,
    }));
  const activeSessions = sessions.filter((s) => {
    const c = coursesById.get(s.courseId)!;
    return c.status === 'ACTIVE' && activeSemesters.has(c.semesterId);
  });
  return recordSchema.parse({
    ...data,
    sessions,
    ...selectClasses(activeSessions, now),
    asOf: now.toISOString(),
  });
}
