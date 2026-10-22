import {
  pgTable,
  text,
  uuid,
  unique,
  foreignKey,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { ownedColumns } from '../core-columns';
import { archiveEntries } from '../archive-entries/archive-entries.schema';
export const archiveEntryLinks = pgTable(
  'archive_entry_links',
  {
    ...ownedColumns(),
    archiveEntryId: uuid('archive_entry_id').notNull(),
    sourceType: text('source_type').notNull(),
    sourceId: uuid('source_id').notNull(),
    relationType: text('relation_type'),
  },
  (t) => [
    foreignKey({
      columns: [t.ownerId, t.archiveEntryId],
      foreignColumns: [archiveEntries.ownerId, archiveEntries.id],
    }).onDelete('cascade'),
    unique('archive_source_unique').on(
      t.archiveEntryId,
      t.sourceType,
      t.sourceId,
    ),
    check(
      'archive_link_type',
      sql`${t.sourceType} in ('TASK','ASSIGNMENT','EXAM','PROJECT','VOYAGE','COURSE','STATUS_MOMENT','LEARNING_RECORD','CLASS_SESSION','CAPTAIN_LOG')`,
    ),
  ],
);
