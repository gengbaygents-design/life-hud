import { pgTable, text, unique, index, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { ownedColumns } from '../core-columns';

export const skills = pgTable(
  'skills',
  {
    ...ownedColumns(),
    name: text('name').notNull(),
    state: text('state').notNull().default('EXPOSED'),
    description: text('description'),
    privacyLevel: text('privacy_level').notNull().default('NORMAL'),
    aiPolicy: text('ai_policy').notNull().default('EXPLICIT_ONLY'),
  },
  (t) => [
    unique('skills_owner_id_unique').on(t.ownerId, t.id),
    index('skills_owner_idx').on(t.ownerId),
    check('skills_version_valid', sql`${t.version}>0`),
    check(
      'skills_privacy_valid',
      sql`${t.privacyLevel} in ('NORMAL','PRIVATE','HIGH_PRIVATE','VAULT')`,
    ),
    check(
      'skills_ai_valid',
      sql`${t.aiPolicy} in ('ALWAYS','WHEN_RELEVANT','EXPLICIT_ONLY','NEVER')`,
    ),
    check(
      'skill_state_valid',
      sql`${t.state} in ('EXPOSED','UNDERSTANDING','PRACTICING','INDEPENDENT','TRANSFER','PROVEN')`,
    ),
  ],
);
