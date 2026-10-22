import {
  pgTable,
  text,
  timestamp,
  uuid,
  boolean,
  unique,
  index,
  foreignKey,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { ownedColumns } from '../core-columns';
import { reminderRules } from '../reminder-rules/reminder-rules.schema';
export const notificationInstances = pgTable(
  'notification_instances',
  {
    ...ownedColumns(),
    reminderRuleId: uuid('reminder_rule_id'),
    title: text('title').notNull(),
    body: text('body'),
    scheduledFor: timestamp('scheduled_for', { withTimezone: true }).notNull(),
    generatedAt: timestamp('generated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    deliveredAt: timestamp('delivered_at', { withTimezone: true }),
    readAt: timestamp('read_at', { withTimezone: true }),
    dismissedAt: timestamp('dismissed_at', { withTimezone: true }),
    priority: text('priority').notNull(),
    dedupeKey: text('dedupe_key').notNull(),
    status: text('status').notNull().default('DELIVERED'),
    silent: boolean('silent').notNull().default(false),
  },
  (t) => [
    unique('notification_owner_id').on(t.ownerId, t.id),
    unique('notification_delivery_once').on(t.ownerId, t.dedupeKey),
    foreignKey({
      columns: [t.ownerId, t.reminderRuleId],
      foreignColumns: [reminderRules.ownerId, reminderRules.id],
    }),
    index('notification_recent').on(t.ownerId, t.generatedAt),
    check(
      'notification_status',
      sql`${t.status} in ('DELIVERED','READ','DISMISSED')`,
    ),
    check('notification_priority', sql`${t.priority} in ('P0','P1','P2','P3')`),
    check('notification_version', sql`${t.version}>0`),
  ],
);
