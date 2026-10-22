import {
  pgTable,
  text,
  integer,
  timestamp,
  uuid,
  unique,
  index,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { ownedColumns } from '../core-columns';

export const exerciseRecords = pgTable(
  'exercise_records',
  {
    ...ownedColumns(),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    activityType: text('activity_type').notNull(),
    durationMinutes: integer('duration_minutes'),
    note: text('note'),
    sourceType: text('source_type'),
    sourceId: uuid('source_id'),
    privacyLevel: text('privacy_level').notNull().default('PRIVATE'),
    aiPolicy: text('ai_policy').notNull().default('EXPLICIT_ONLY'),
  },
  (t) => [
    unique('exercise_records_owner_id_unique').on(t.ownerId, t.id),
    index('exercise_records_owner_idx').on(t.ownerId),
    check('exercise_records_version_valid', sql`${t.version}>0`),
    check(
      'exercise_records_privacy_valid',
      sql`${t.privacyLevel} in ('NORMAL','PRIVATE','HIGH_PRIVATE','VAULT')`,
    ),
    check(
      'exercise_records_ai_valid',
      sql`${t.aiPolicy} in ('ALWAYS','WHEN_RELEVANT','EXPLICIT_ONLY','NEVER')`,
    ),
    check(
      'exercise_range_valid',
      sql`${t.endedAt} is null or ${t.endedAt}>=${t.startedAt}`,
    ),
    check(
      'exercise_duration_valid',
      sql`${t.durationMinutes} is null or ${t.durationMinutes} between 1 and 4320`,
    ),
    check(
      'exercise_records_source_pair',
      sql`(${t.sourceType} is null)=(${t.sourceId} is null)`,
    ),
  ],
);
