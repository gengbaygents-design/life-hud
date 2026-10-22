import {
  pgTable,
  text,
  date,
  jsonb,
  unique,
  index,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { ownedColumns } from '../core-columns';

export const cycleRecords = pgTable(
  'cycle_records',
  {
    ...ownedColumns(),
    startDate: date('start_date').notNull(),
    endDate: date('end_date'),
    symptomsJson:
      jsonb('symptoms_json').$type<Record<string, string | number | boolean>>(),
    note: text('note'),
    privacyLevel: text('privacy_level').notNull().default('HIGH_PRIVATE'),
    aiPolicy: text('ai_policy').notNull().default('NEVER'),
  },
  (t) => [
    unique('cycle_records_owner_id_unique').on(t.ownerId, t.id),
    index('cycle_records_owner_idx').on(t.ownerId),
    check('cycle_records_version_valid', sql`${t.version}>0`),
    check(
      'cycle_records_privacy_valid',
      sql`${t.privacyLevel} in ('NORMAL','PRIVATE','HIGH_PRIVATE','VAULT')`,
    ),
    check(
      'cycle_records_ai_valid',
      sql`${t.aiPolicy} in ('ALWAYS','WHEN_RELEVANT','EXPLICIT_ONLY','NEVER')`,
    ),
    check(
      'cycle_range_valid',
      sql`${t.endDate} is null or ${t.endDate}>=${t.startDate}`,
    ),
    check(
      'cycle_privacy_minimum',
      sql`${t.privacyLevel} in ('HIGH_PRIVATE','VAULT') and ${t.aiPolicy}='NEVER'`,
    ),
  ],
);
