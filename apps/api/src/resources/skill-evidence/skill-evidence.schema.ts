import {
  pgTable,
  text,
  timestamp,
  uuid,
  unique,
  index,
  foreignKey,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { ownedColumns } from '../core-columns';
import { skills } from '../skills/skills.schema';
export const skillEvidence = pgTable(
  'skill_evidence',
  {
    ...ownedColumns(),
    skillId: uuid('skill_id').notNull(),
    evidenceType: text('evidence_type').notNull(),
    sourceType: text('source_type').notNull(),
    sourceId: uuid('source_id').notNull(),
    note: text('note'),
    observedAt: timestamp('observed_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    privacyLevel: text('privacy_level').notNull().default('PRIVATE'),
    aiPolicy: text('ai_policy').notNull().default('EXPLICIT_ONLY'),
  },
  (t) => [
    unique('skill_evidence_owner_id_unique').on(t.ownerId, t.id),
    index('skill_evidence_owner_idx').on(t.ownerId),
    check('skill_evidence_version_valid', sql`${t.version}>0`),
    check(
      'skill_evidence_privacy_valid',
      sql`${t.privacyLevel} in ('NORMAL','PRIVATE','HIGH_PRIVATE','VAULT')`,
    ),
    check(
      'skill_evidence_ai_valid',
      sql`${t.aiPolicy} in ('ALWAYS','WHEN_RELEVANT','EXPLICIT_ONLY','NEVER')`,
    ),
    foreignKey({
      columns: [t.ownerId, t.skillId],
      foreignColumns: [skills.ownerId, skills.id],
    }),
    check(
      'evidence_type_valid',
      sql`${t.evidenceType} in ('CONTACT','UNDERSTANDING','PRACTICE','INDEPENDENT','TRANSFER','OUTPUT')`,
    ),
    check(
      'skill_evidence_source_pair',
      sql`(${t.sourceType} is null)=(${t.sourceId} is null)`,
    ),
  ],
);
