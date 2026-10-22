import {
  pgTable,
  text,
  timestamp,
  uuid,
  unique,
  index,
  foreignKey,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { ownedColumns } from '../core-columns';
import { courses } from '../courses/courses.schema';
import { places } from '../places/places.schema';
export const exams = pgTable(
  'exams',
  {
    ...ownedColumns(),
    courseId: uuid('course_id').notNull(),
    title: text('title').notNull(),
    examType: text('exam_type'),
    startAt: timestamp('start_at', { withTimezone: true }).notNull(),
    endAt: timestamp('end_at', { withTimezone: true }),
    placeId: uuid('place_id'),
  },
  (t) => [
    unique('exams_owner_id_unique').on(t.ownerId, t.id),
    index('exams_owner_idx').on(t.ownerId),
    check('exams_version_valid', sql`${t.version}>0`),
    foreignKey({
      columns: [t.ownerId, t.courseId],
      foreignColumns: [courses.ownerId, courses.id],
    }),
    foreignKey({
      columns: [t.ownerId, t.placeId],
      foreignColumns: [places.ownerId, places.id],
    }),
    check(
      'exam_range_valid',
      sql`${t.endAt} is null or ${t.endAt} >= ${t.startAt}`,
    ),
  ],
);
