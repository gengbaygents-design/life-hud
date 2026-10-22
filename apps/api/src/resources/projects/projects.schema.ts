import {
  check,
  foreignKey,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { ownedColumns } from '../core-columns';
import { voyages } from '../voyages/voyages.schema';
export const projects = pgTable(
  'projects',
  {
    ...ownedColumns(),
    title: text('title').notNull(),
    description: text('description'),
    status: text('status')
      .$type<'ACTIVE' | 'COMPLETED' | 'ARCHIVED'>()
      .notNull()
      .default('ACTIVE'),
    startAt: timestamp('start_at', { withTimezone: true }),
    endAt: timestamp('end_at', { withTimezone: true }),
    voyageId: uuid('voyage_id'),
  },
  (t) => [
    unique('projects_owner_id_unique').on(t.ownerId, t.id),
    foreignKey({
      columns: [t.ownerId, t.voyageId],
      foreignColumns: [voyages.ownerId, voyages.id],
    }),
    check(
      'projects_status_valid',
      sql`${t.status} in ('ACTIVE','COMPLETED','ARCHIVED')`,
    ),
    check('projects_version_valid', sql`${t.version}>0`),
    check(
      'projects_title_valid',
      sql`length(btrim(${t.title})) between 1 and 255`,
    ),
    check(
      'projects_range_valid',
      sql`${t.endAt} is null or ${t.startAt} is null or ${t.endAt} >= ${t.startAt}`,
    ),
  ],
);
