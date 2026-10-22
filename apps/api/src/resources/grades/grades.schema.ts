import {
  pgTable,
  text,
  real,
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
export const grades = pgTable(
  'grades',
  {
    ...ownedColumns(),
    courseId: uuid('course_id').notNull(),
    assessmentType: text('assessment_type'),
    reference: text('reference'),
    score: real('score'),
    maxScore: real('max_score'),
    weight: real('weight'),
    recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    unique('grades_owner_id_unique').on(t.ownerId, t.id),
    index('grades_owner_idx').on(t.ownerId),
    check('grades_version_valid', sql`${t.version}>0`),
    foreignKey({
      columns: [t.ownerId, t.courseId],
      foreignColumns: [courses.ownerId, courses.id],
    }),
    check(
      'grade_values_valid',
      sql`(${t.score} is null or ${t.score} >= 0) and (${t.maxScore} is null or ${t.maxScore}>0) and (${t.weight} is null or ${t.weight} between 0 and 1) and (${t.score} is null or ${t.maxScore} is null or ${t.score} <= ${t.maxScore})`,
    ),
  ],
);
