import {
  pgTable,
  text,
  real,
  uuid,
  unique,
  index,
  foreignKey,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { ownedColumns } from '../core-columns';
import { semesters } from '../semesters/semesters.schema';
export const courses = pgTable(
  'courses',
  {
    ...ownedColumns(),
    semesterId: uuid('semester_id').notNull(),
    name: text('name').notNull(),
    code: text('code'),
    teacher: text('teacher'),
    credits: real('credits'),
    status: text('status').notNull().default('ACTIVE'),
  },
  (t) => [
    unique('courses_owner_id_unique').on(t.ownerId, t.id),
    index('courses_owner_idx').on(t.ownerId),
    check('courses_version_valid', sql`${t.version}>0`),
    foreignKey({
      columns: [t.ownerId, t.semesterId],
      foreignColumns: [semesters.ownerId, semesters.id],
    }),
    check(
      'course_credits_valid',
      sql`${t.credits} is null or ${t.credits} between 0 and 100`,
    ),
    check(
      'course_status_valid',
      sql`${t.status} in ('ACTIVE','COMPLETED','ARCHIVED')`,
    ),
  ],
);
