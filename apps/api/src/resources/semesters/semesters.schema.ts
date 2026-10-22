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
import { voyages } from '../voyages/voyages.schema';
export const semesters = pgTable(
  'semesters',
  {
    ...ownedColumns(),
    voyageId: uuid('voyage_id').notNull(),
    name: text('name').notNull(),
    startAt: timestamp('start_at', { withTimezone: true }).notNull(),
    endAt: timestamp('end_at', { withTimezone: true }).notNull(),
    status: text('status').notNull().default('ACTIVE'),
  },
  (t) => [
    unique('semesters_owner_id_unique').on(t.ownerId, t.id),
    index('semesters_owner_idx').on(t.ownerId),
    check('semesters_version_valid', sql`${t.version}>0`),
    foreignKey({
      columns: [t.ownerId, t.voyageId],
      foreignColumns: [voyages.ownerId, voyages.id],
    }),
    check('semester_range_valid', sql`${t.endAt} >= ${t.startAt}`),
    check(
      'semester_status_valid',
      sql`${t.status} in ('ACTIVE','COMPLETED','ARCHIVED')`,
    ),
  ],
);
