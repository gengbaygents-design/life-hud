import { pgTable, text, unique, index, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { ownedColumns } from '../core-columns';

export const places = pgTable(
  'places',
  { ...ownedColumns(), name: text('name').notNull(), note: text('note') },
  (t) => [
    unique('places_owner_id_unique').on(t.ownerId, t.id),
    index('places_owner_idx').on(t.ownerId),
    check('places_version_valid', sql`${t.version}>0`),
  ],
);
