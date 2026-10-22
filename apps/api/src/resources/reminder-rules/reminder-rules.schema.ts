import {
  pgTable,
  text,
  timestamp,
  unique,
  index,
  check,
  uuid,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { ownedColumns } from '../core-columns';
export const reminderRules = pgTable(
  'reminder_rules',
  {
    ...ownedColumns(),
    title: text('title').notNull(),
    sourceType: text('source_type'),
    sourceId: uuid('source_id'),
    scheduleType: text('schedule_type').notNull().default('ONCE'),
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }).notNull(),
    cronExpression: text('cron_expression'),
    priority: text('priority').notNull().default('P2'),
    timeZone: text('time_zone').notNull().default('Asia/Shanghai'),
    quietStart: text('quiet_start').notNull().default('23:30'),
    quietEnd: text('quiet_end').notNull().default('07:30'),
    quietHoursPolicy: text('quiet_hours_policy').notNull().default('DEFER'),
    status: text('status').notNull().default('ACTIVE'),
    lastTriggeredAt: timestamp('last_triggered_at', { withTimezone: true }),
    nextTriggerAt: timestamp('next_trigger_at', { withTimezone: true }),
    logicalKey: text('logical_key').notNull(),
  },
  (t) => [
    unique('reminder_owner_id').on(t.ownerId, t.id),
    unique('reminder_logical_key').on(t.ownerId, t.logicalKey),
    index('reminder_pending')
      .on(t.nextTriggerAt)
      .where(sql`${t.status}='ACTIVE' and ${t.deletedAt} is null`),
    check('reminder_priority', sql`${t.priority} in ('P0','P1','P2','P3')`),
    check(
      'reminder_status',
      sql`${t.status} in ('ACTIVE','FIRED','CANCELLED')`,
    ),
    check(
      'reminder_once',
      sql`${t.scheduleType}='ONCE' and ${t.cronExpression} is null`,
    ),
    check(
      'reminder_source',
      sql`(${t.sourceType} is null and ${t.sourceId} is null) or (${t.sourceType} in ('TASK','ASSIGNMENT','EXAM') and ${t.sourceId} is not null)`,
    ),
    check(
      'reminder_quiet_policy',
      sql`${t.quietHoursPolicy} in ('DEFER','SILENT')`,
    ),
    check('reminder_version', sql`${t.version}>0`),
    check('reminder_title', sql`length(btrim(${t.title})) between 1 and 200`),
    check(
      'reminder_pending_time',
      sql`(${t.status}='ACTIVE' and ${t.nextTriggerAt} is not null) or (${t.status}<>'ACTIVE' and ${t.nextTriggerAt} is null)`,
    ),
  ],
);
