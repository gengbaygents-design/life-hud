import {
  pgTable,
  text,
  integer,
  unique,
  index,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { ownedColumns } from '../core-columns';

export const files = pgTable(
  'core_files',
  {
    ...ownedColumns(),
    key: text('key').notNull(),
    name: text('name').notNull(),
    contentType: text('content_type').notNull(),
    size: integer('size').notNull(),
  },
  (t) => [
    unique('core_files_owner_id_unique').on(t.ownerId, t.id),
    index('core_files_owner_idx').on(t.ownerId),
    check('core_files_version_valid', sql`${t.version}>0`),
    unique('core_files_identity_0').on(t.key),
    check('core_files_size_valid', sql`${t.size} between 0 and 20971520`),
  ],
);
