import {
  pgTable,
  text,
  integer,
  timestamp,
  unique,
  index,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { ownedColumns } from '../core-columns';

export const waterRecords = pgTable(
  'water_records',
  {
    ...ownedColumns(),
    recordedAt: timestamp('recorded_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    amountMl: integer('amount_ml').notNull(),
    privacyLevel: text('privacy_level').notNull().default('PRIVATE'),
    aiPolicy: text('ai_policy').notNull().default('EXPLICIT_ONLY'),
  },
  (t) => [
    unique('water_records_owner_id_unique').on(t.ownerId, t.id),
    index('water_records_owner_idx').on(t.ownerId),
    check('water_records_version_valid', sql`${t.version}>0`),
    check(
      'water_records_privacy_valid',
      sql`${t.privacyLevel} in ('NORMAL','PRIVATE','HIGH_PRIVATE','VAULT')`,
    ),
    check(
      'water_records_ai_valid',
      sql`${t.aiPolicy} in ('ALWAYS','WHEN_RELEVANT','EXPLICIT_ONLY','NEVER')`,
    ),
    check('water_amount_valid', sql`${t.amountMl} between 1 and 10000`),
  ],
);
