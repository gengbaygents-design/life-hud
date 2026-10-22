import {
  pgTable,
  text,
  timestamp,
  uuid,
  unique,
  foreignKey,
  index,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { ownedColumns } from '../core-columns';
import { voyages } from '../voyages/voyages.schema';
export const captainLogs = pgTable(
  'captain_logs',
  {
    ...ownedColumns(),
    body: text('body').notNull(),
    recordedAt: timestamp('recorded_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    voyageId: uuid('voyage_id'),
    privacyLevel: text('privacy_level').notNull().default('PRIVATE'),
    aiAccessPolicy: text('ai_access_policy').notNull().default('EXPLICIT_ONLY'),
  },
  (t) => [
    unique('captain_owner_id').on(t.ownerId, t.id),
    foreignKey({
      columns: [t.ownerId, t.voyageId],
      foreignColumns: [voyages.ownerId, voyages.id],
    }),
    index('captain_time').on(t.ownerId, t.recordedAt),
    check('captain_body', sql`length(btrim(${t.body})) between 1 and 30000`),
    check(
      'captain_privacy',
      sql`${t.privacyLevel} in ('PRIVATE','HIGH_PRIVATE','VAULT')`,
    ),
    check(
      'captain_ai',
      sql`${t.aiAccessPolicy} in ('ALWAYS','WHEN_RELEVANT','EXPLICIT_ONLY','NEVER')`,
    ),
    check('captain_version', sql`${t.version}>0`),
  ],
);
