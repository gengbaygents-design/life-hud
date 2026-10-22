import {
  pgTable,
  text,
  uuid,
  unique,
  uniqueIndex,
  index,
  foreignKey,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { ownedColumns } from '../core-columns';
import { courses } from '../courses/courses.schema';
export const enrollments = pgTable(
  'enrollments',
  {
    ...ownedColumns(),
    courseId: uuid('course_id').notNull(),
    status: text('status').notNull().default('ENROLLED'),
  },
  (t) => [
    unique('enrollments_owner_id_unique').on(t.ownerId, t.id),
    index('enrollments_owner_idx').on(t.ownerId),
    check('enrollments_version_valid', sql`${t.version}>0`),
    foreignKey({
      columns: [t.ownerId, t.courseId],
      foreignColumns: [courses.ownerId, courses.id],
    }),
    uniqueIndex('enrollments_identity_0')
      .on(t.ownerId, t.courseId)
      .where(sql`${t.deletedAt} is null`),
    check(
      'enrollment_status_valid',
      sql`${t.status} in ('ENROLLED','COMPLETED','WITHDRAWN')`,
    ),
  ],
);
