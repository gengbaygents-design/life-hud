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

export const sleepRecords = pgTable(
  'sleep_records',
  {
    ...ownedColumns(),
    sleepStart: timestamp('sleep_start', { withTimezone: true }).notNull(),
    wakeAt: timestamp('wake_at', { withTimezone: true }).notNull(),
    quality: integer('quality'),
    note: text('note'),
    sourceType: text('source_type'),
    sourceId: uuid('source_id'),
    privacyLevel: text('privacy_level').notNull().default('PRIVATE'),
    aiPolicy: text('ai_policy').notNull().default('EXPLICIT_ONLY'),
  },
  (t) => [
    unique('sleep_records_owner_id_unique').on(t.ownerId, t.id),
    index('sleep_records_owner_idx').on(t.ownerId),
    check('sleep_records_version_valid', sql`${t.version}>0`),
    check(
      'sleep_records_privacy_valid',
      sql`${t.privacyLevel} in ('NORMAL','PRIVATE','HIGH_PRIVATE','VAULT')`,
    ),
    check(
      'sleep_records_ai_valid',
      sql`${t.aiPolicy} in ('ALWAYS','WHEN_RELEVANT','EXPLICIT_ONLY','NEVER')`,
    ),
    check(
      'sleep_range_valid',
      sql`${t.wakeAt}>${t.sleepStart} and ${t.wakeAt}-${t.sleepStart}<=interval '72 hours'`,
    ),
    check(
      'sleep_quality_valid',
      sql`${t.quality} is null or ${t.quality} between 1 and 5`,
    ),
    check(
      'sleep_records_source_pair',
      sql`(${t.sourceType} is null)=(${t.sourceId} is null)`,
    ),
  ],
);
