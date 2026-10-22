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
import { tasks } from '../tasks/tasks.schema';
export const assignments = pgTable(
  'assignments',
  {
    ...ownedColumns(),
    courseId: uuid('course_id').notNull(),
    title: text('title').notNull(),
    description: text('description'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    dueAt: timestamp('due_at', { withTimezone: true }),
    workState: text('work_state').notNull().default('NOT_STARTED'),
    submissionState: text('submission_state')
      .notNull()
      .default('NOT_SUBMITTED'),
    submittedAt: timestamp('submitted_at', { withTimezone: true }),
    taskId: uuid('task_id'),
  },
  (t) => [
    unique('assignments_owner_id_unique').on(t.ownerId, t.id),
    index('assignments_owner_idx').on(t.ownerId),
    check('assignments_version_valid', sql`${t.version}>0`),
    foreignKey({
      columns: [t.ownerId, t.courseId],
      foreignColumns: [courses.ownerId, courses.id],
    }),
    foreignKey({
      columns: [t.ownerId, t.taskId],
      foreignColumns: [tasks.ownerId, tasks.id],
    }),
    unique('assignments_identity_0').on(t.taskId),
    check(
      'assignment_work_valid',
      sql`${t.workState} in ('NOT_STARTED','IN_PROGRESS','DONE')`,
    ),
    check(
      'assignment_submission_valid',
      sql`${t.submissionState} in ('NOT_SUBMITTED','SUBMITTED') and (${t.submissionState}='SUBMITTED')=(${t.submittedAt} is not null)`,
    ),
    check(
      'assignment_distinct_task',
      sql`${t.taskId} is null or ${t.taskId} <> ${t.id}`,
    ),
  ],
);
