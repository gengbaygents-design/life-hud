import {
  check,
  pgTable,
  text,
  uuid,
  jsonb,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { ownedColumns } from '../core-columns';
export const entityLinks = pgTable(
  'entity_links',
  {
    ...ownedColumns(),
    fromType: text('from_type').notNull(),
    fromId: uuid('from_id').notNull(),
    relationType: text('relation_type').notNull(),
    toType: text('to_type').notNull(),
    toId: uuid('to_id').notNull(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  },
  (t) => [
    uniqueIndex('entity_links_semantic_unique')
      .on(t.ownerId, t.fromType, t.fromId, t.relationType, t.toType, t.toId)
      .where(sql`${t.deletedAt} is null`),
    check(
      'entity_links_types_valid',
      sql`${t.fromType} in ('TASK','PROJECT','GOAL','VOYAGE','COURSE','ASSIGNMENT','FILE','PLACE','LEARNING_RECORD','LEARNING_MISTAKE','SKILL') and ${t.toType} in ('TASK','PROJECT','GOAL','VOYAGE','COURSE','ASSIGNMENT','FILE','PLACE','LEARNING_RECORD','LEARNING_MISTAKE','SKILL')`,
    ),
    check(
      'entity_links_relation_valid',
      sql`${t.relationType} in ('BELONGS_TO','RELATED_TO','APPLIED_TO') and (${t.relationType}<>'APPLIED_TO' or (${t.fromType}='LEARNING_RECORD' and ${t.toType}='PROJECT'))`,
    ),
    check(
      'entity_links_not_self',
      sql`${t.fromType} <> ${t.toType} or ${t.fromId} <> ${t.toId}`,
    ),
    check(
      'entity_links_metadata_bound',
      sql`${t.metadata} is null or octet_length(${t.metadata}::text)<=4096`,
    ),
    check('entity_links_version_valid', sql`${t.version}>0`),
  ],
);
