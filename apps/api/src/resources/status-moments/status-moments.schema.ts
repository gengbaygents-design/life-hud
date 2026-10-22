import {
  pgTable,
  text,
  integer,
  timestamp,
  uuid,
  jsonb,
  unique,
  index,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { ownedColumns } from '../core-columns';

export const statusMoments = pgTable(
  'status_moments',
  {
    ...ownedColumns(),
    recordedAt: timestamp('recorded_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    mood: text('mood'),
    customMood: text('custom_mood'),
    energy: integer('energy'),
    stress: integer('stress'),
    focus: integer('focus'),
    bodyStateJson:
      jsonb('body_state_json').$type<
        Record<string, string | number | boolean>
      >(),
    note: text('note'),
    sourceType: text('source_type'),
    sourceId: uuid('source_id'),
    privacyLevel: text('privacy_level').notNull().default('PRIVATE'),
    aiPolicy: text('ai_policy').notNull().default('EXPLICIT_ONLY'),
  },
  (t) => [
    unique('status_moments_owner_id_unique').on(t.ownerId, t.id),
    index('status_moments_owner_idx').on(t.ownerId),
    check('status_moments_version_valid', sql`${t.version}>0`),
    check(
      'status_moments_privacy_valid',
      sql`${t.privacyLevel} in ('NORMAL','PRIVATE','HIGH_PRIVATE','VAULT')`,
    ),
    check(
      'status_moments_ai_valid',
      sql`${t.aiPolicy} in ('ALWAYS','WHEN_RELEVANT','EXPLICIT_ONLY','NEVER')`,
    ),
    check(
      'status_mood_valid',
      sql`${t.mood} is null or ${t.mood} in ('HAPPY','CALM','TIRED','ANXIOUS','SAD','OTHER')`,
    ),
    check(
      'status_partial_nonempty',
      sql`${t.mood} is not null or ${t.energy} is not null or ${t.stress} is not null or ${t.focus} is not null or ${t.bodyStateJson} is not null or length(btrim(coalesce(${t.note},'')))>0`,
    ),
    check(
      'status_energy_valid',
      sql`${t.energy} is null or ${t.energy} between 1 and 5`,
    ),
    check(
      'status_stress_valid',
      sql`${t.stress} is null or ${t.stress} between 1 and 5`,
    ),
    check(
      'status_focus_valid',
      sql`${t.focus} is null or ${t.focus} between 1 and 5`,
    ),
    check(
      'status_moments_source_pair',
      sql`(${t.sourceType} is null)=(${t.sourceId} is null)`,
    ),
  ],
);
