import {
  check,
  foreignKey,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { ownedColumns } from '../core-columns';
import { projects } from '../projects/projects.schema';
export type TaskStatus =
  | 'INBOX'
  | 'PLANNED'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'DELAYED'
  | 'DROPPED';
export type TaskImportance = 'LOW' | 'NORMAL' | 'HIGH';
export const tasks = pgTable(
  'tasks',
  {
    ...ownedColumns(),
    title: text('title').notNull(),
    description: text('description'),
    status: text('status').$type<TaskStatus>().notNull().default('INBOX'),
    importance: text('importance')
      .$type<TaskImportance>()
      .notNull()
      .default('NORMAL'),
    plannedStart: timestamp('planned_start', { withTimezone: true }),
    plannedEnd: timestamp('planned_end', { withTimezone: true }),
    dueAt: timestamp('due_at', { withTimezone: true }),
    estimatedMinutes: integer('estimated_minutes'),
    actualMinutes: integer('actual_minutes'),
    projectId: uuid('project_id'),
    sourceType: text('source_type').$type<'PROJECT' | 'GOAL' | 'VOYAGE' | 'ASSIGNMENT'>(),
    sourceId: uuid('source_id'),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (t) => [
    unique('tasks_owner_id_unique').on(t.ownerId, t.id),
    uniqueIndex('tasks_assignment_source_unique').on(t.ownerId,t.sourceId).where(sql`${t.sourceType}='ASSIGNMENT'`),
    index('tasks_owner_status_idx')
      .on(t.ownerId, t.status, t.dueAt, t.plannedStart)
      .where(sql`${t.deletedAt} is null`),
    foreignKey({
      columns: [t.ownerId, t.projectId],
      foreignColumns: [projects.ownerId, projects.id],
    }),
    check(
      'tasks_title_valid',
      sql`length(btrim(${t.title})) between 1 and 255`,
    ),
    check('tasks_version_valid', sql`${t.version}>0`),
    check(
      'tasks_status_valid',
      sql`${t.status} in ('INBOX','PLANNED','ACTIVE','COMPLETED','DELAYED','DROPPED')`,
    ),
    check(
      'tasks_importance_valid',
      sql`${t.importance} in ('LOW','NORMAL','HIGH')`,
    ),
    check(
      'tasks_plan_range_valid',
      sql`${t.plannedEnd} is null or (${t.plannedStart} is not null and ${t.plannedEnd} >= ${t.plannedStart})`,
    ),
    check(
      'tasks_estimate_valid',
      sql`${t.estimatedMinutes} is null or ${t.estimatedMinutes} between 1 and 10080`,
    ),
    check(
      'tasks_actual_valid',
      sql`${t.actualMinutes} is null or ${t.actualMinutes} between 0 and 100000`,
    ),
    check(
      'tasks_completion_valid',
      sql`(${t.status} = 'COMPLETED') = (${t.completedAt} is not null)`,
    ),
    check(
      'tasks_source_valid',
      sql`(${t.sourceType} is null and ${t.sourceId} is null) or (${t.sourceType} is not null and ${t.sourceType} in ('PROJECT','GOAL','VOYAGE','ASSIGNMENT') and ${t.sourceId} is not null)`,
    ),
  ],
);
