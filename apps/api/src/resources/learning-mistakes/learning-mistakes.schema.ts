import {
  pgTable,
  text,
  timestamp,
  uuid,
  unique,
  index,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { ownedColumns } from '../core-columns';

export const learningMistakes = pgTable(
  'learning_mistakes',
  {
    ...ownedColumns(),
    title: text('title').notNull(),
    sourceType: text('source_type'),
    sourceId: uuid('source_id'),
    mistakeDescription: text('mistake_description').notNull(),
    correctUnderstanding: text('correct_understanding'),
    status: text('status').notNull().default('OPEN'),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    privacyLevel: text('privacy_level').notNull().default('PRIVATE'),
    aiPolicy: text('ai_policy').notNull().default('EXPLICIT_ONLY'),
  },
  (t) => [
    unique('learning_mistakes_owner_id_unique').on(t.ownerId, t.id),
    index('learning_mistakes_owner_idx').on(t.ownerId),
    check('learning_mistakes_version_valid', sql`${t.version}>0`),
    check(
      'learning_mistakes_privacy_valid',
      sql`${t.privacyLevel} in ('NORMAL','PRIVATE','HIGH_PRIVATE','VAULT')`,
    ),
    check(
      'learning_mistakes_ai_valid',
      sql`${t.aiPolicy} in ('ALWAYS','WHEN_RELEVANT','EXPLICIT_ONLY','NEVER')`,
    ),
    check(
      'mistake_status_valid',
      sql`${t.status} in ('OPEN','REVIEWED','RESOLVED')`,
    ),
    check(
      'learning_mistakes_source_pair',
      sql`(${t.sourceType} is null)=(${t.sourceId} is null)`,
    ),
  ],
);
