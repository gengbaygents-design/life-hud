import { pgTable, text, unique, index, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { ownedColumns } from '../core-columns';

export const learningRecords = pgTable(
  'learning_records',
  {
    ...ownedColumns(),
    title: text('title').notNull(),
    sourceKind: text('source_kind'),
    sourceRef: text('source_ref'),
    reflection: text('reflection'),
    questions: text('questions'),
    applications: text('applications'),
    projectIdeas: text('project_ideas'),
    createdBy: text('created_by').notNull(),
    privacyLevel: text('privacy_level').notNull().default('PRIVATE'),
    aiPolicy: text('ai_policy').notNull().default('EXPLICIT_ONLY'),
  },
  (t) => [
    unique('learning_records_owner_id_unique').on(t.ownerId, t.id),
    index('learning_records_owner_idx').on(t.ownerId),
    check('learning_records_version_valid', sql`${t.version}>0`),
    check(
      'learning_records_privacy_valid',
      sql`${t.privacyLevel} in ('NORMAL','PRIVATE','HIGH_PRIVATE','VAULT')`,
    ),
    check(
      'learning_records_ai_valid',
      sql`${t.aiPolicy} in ('ALWAYS','WHEN_RELEVANT','EXPLICIT_ONLY','NEVER')`,
    ),
    check('learning_user_author', sql`${t.createdBy}=${t.ownerId}`),
    check(
      'learning_kind_valid',
      sql`${t.sourceKind} is null or ${t.sourceKind} in ('TEXT','URL','IMAGE','FILE','COURSE','ASSIGNMENT','OTHER')`,
    ),
  ],
);
