import {
  check,
  foreignKey,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { ownedColumns } from '../core-columns';
export const voyages = pgTable(
  'voyages',
  {
    ...ownedColumns(),
    parentVoyageId: uuid('parent_voyage_id'),
    title: text('title').notNull(),
    voyageType: text('voyage_type')
      .$type<'UNIVERSITY'>()
      .notNull()
      .default('UNIVERSITY'),
    primaryContext: text('primary_context').notNull().default('UNIVERSITY'),
    status: text('status')
      .$type<'ACTIVE' | 'COMPLETED' | 'ARCHIVED'>()
      .notNull()
      .default('ACTIVE'),
    startAt: timestamp('start_at', { withTimezone: true }).notNull(),
    endAt: timestamp('end_at', { withTimezone: true }),
    summary: text('summary'),
    visualSeed: text('visual_seed'),
  },
  (t) => [
    unique('voyages_owner_id_unique').on(t.ownerId, t.id),
    foreignKey({
      columns: [t.ownerId, t.parentVoyageId],
      foreignColumns: [t.ownerId, t.id],
    }),
    check(
      'voyages_parent_not_self',
      sql`${t.parentVoyageId} is null or ${t.parentVoyageId} <> ${t.id}`,
    ),
    uniqueIndex('voyages_active_university_unique')
      .on(t.ownerId)
      .where(
        sql`${t.deletedAt} is null and ${t.status} = 'ACTIVE' and ${t.voyageType} = 'UNIVERSITY'`,
      ),
    check(
      'voyages_status_valid',
      sql`${t.status} in ('ACTIVE','COMPLETED','ARCHIVED')`,
    ),
    check('voyages_version_valid', sql`${t.version}>0`),
    check(
      'voyages_title_valid',
      sql`length(btrim(${t.title})) between 1 and 255`,
    ),
    check('voyages_type_valid', sql`${t.voyageType} = 'UNIVERSITY'`),
    check(
      'voyages_range_valid',
      sql`${t.endAt} is null or ${t.endAt} >= ${t.startAt}`,
    ),
  ],
);
