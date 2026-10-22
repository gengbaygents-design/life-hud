import { check, pgTable, text, timestamp, unique } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { ownedColumns } from '../core-columns';
export const goals = pgTable(
  'goals',
  {
    ...ownedColumns(),
    title: text('title').notNull(),
    description: text('description'),
    status: text('status')
      .$type<'ACTIVE' | 'COMPLETED' | 'DROPPED'>()
      .notNull()
      .default('ACTIVE'),
    horizon: text('horizon'),
    targetDate: timestamp('target_date', { withTimezone: true }),
  },
  (t) => [
    unique('goals_owner_id_unique').on(t.ownerId, t.id),
    check(
      'goals_status_valid',
      sql`${t.status} in ('ACTIVE','COMPLETED','DROPPED')`,
    ),
    check('goals_version_valid', sql`${t.version}>0`),
    check(
      'goals_title_valid',
      sql`length(btrim(${t.title})) between 1 and 255`,
    ),
  ],
);
