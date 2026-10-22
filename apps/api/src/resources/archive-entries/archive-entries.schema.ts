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
export const archiveEntries = pgTable(
  'archive_entries',
  {
    ...ownedColumns(),
    archiveType: text('archive_type').notNull().default('MOMENT'),
    recordedAt: timestamp('recorded_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    periodStart: timestamp('period_start', { withTimezone: true }),
    periodEnd: timestamp('period_end', { withTimezone: true }),
    voyageId: uuid('voyage_id'),
    title: text('title').notNull(),
    summary: text('summary'),
    privacyLevel: text('privacy_level').notNull().default('PRIVATE'),
  },
  (t) => [
    unique('archive_owner_id').on(t.ownerId, t.id),
    foreignKey({
      columns: [t.ownerId, t.voyageId],
      foreignColumns: [voyages.ownerId, voyages.id],
    }),
    index('archive_time').on(t.ownerId, t.recordedAt),
    check('archive_type', sql`${t.archiveType} in ('MOMENT','PERIOD')`),
    check(
      'archive_privacy',
      sql`${t.privacyLevel} in ('PRIVATE','HIGH_PRIVATE','VAULT')`,
    ),
    check(
      'archive_period',
      sql`${t.periodEnd} is null or (${t.periodStart} is not null and ${t.periodEnd}>=${t.periodStart})`,
    ),
    check('archive_title', sql`length(btrim(${t.title})) between 1 and 200`),
    check('archive_version', sql`${t.version}>0`),
  ],
);
