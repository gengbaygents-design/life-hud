import { sql } from 'drizzle-orm';
import {
  pgTable,
  text,
  uuid,
  timestamp,
  jsonb,
  integer,
  boolean,
  unique,
  check,
  index,
} from 'drizzle-orm/pg-core';
import { users } from '../users/users.schema';
import { aiChats } from '../ai-chats/ai-chats.schema';
import { aiMessages } from '../ai-chats/ai-messages.schema';
import type { ActionResult, LimTrace } from './types';

export const actionGroups = pgTable(
  'action_groups',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    ownerId: text('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    sourceConversationId: uuid('source_conversation_id').references(
      () => aiChats.id,
      { onDelete: 'set null' },
    ),
    sourceMessageId: uuid('source_message_id').references(() => aiMessages.id, {
      onDelete: 'set null',
    }),
    requestId: uuid('request_id').notNull(),
    fingerprint: text('fingerprint').notNull(),
    status: text('status')
      .$type<
        'PROCESSING' | 'SUCCESS' | 'PARTIAL' | 'FAILED' | 'CLARIFICATION'
      >()
      .notNull()
      .default('PROCESSING'),
    mode: text('mode').$type<'EXECUTE' | 'ASSIST' | 'TALK'>(),
    riskLevel: text('risk_level')
      .$type<'R0' | 'R1' | 'R2' | 'R3'>()
      .notNull()
      .default('R0'),
    reply: text('reply').notNull().default(''),
    result: jsonb('result').$type<ActionResult>(),
    trace: jsonb('trace').$type<LimTrace>(),
    undoToken: uuid('undo_token'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (t) => [
    unique('action_group_owner_request_unique').on(t.ownerId, t.requestId),
    index('action_group_conversation_idx').on(
      t.sourceConversationId,
      t.createdAt,
    ),
    check(
      'action_group_status_valid',
      sql`${t.status} in ('PROCESSING','SUCCESS','PARTIAL','FAILED','CLARIFICATION')`,
    ),
  ],
);

export const actionExecutions = pgTable(
  'action_executions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    actionGroupId: uuid('action_group_id')
      .notNull()
      .references(() => actionGroups.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    actionType: text('action_type').notNull(),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
    status: text('status')
      .$type<'PENDING' | 'SUCCESS' | 'FAILED' | 'UNDONE' | 'SKIPPED'>()
      .notNull()
      .default('PENDING'),
    validationResult: text('validation_result'),
    executionResult: jsonb('execution_result').$type<{
      type: string;
      id: string;
      version: number;
      taskId?: string | null;
      taskVersion?: number;
      created: boolean;
    }>(),
    reversible: boolean('reversible').notNull().default(false),
    beforeState: jsonb('before_state').$type<Record<string, unknown>>(),
    afterState: jsonb('after_state').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (t) => [
    unique('action_execution_group_position_unique').on(
      t.actionGroupId,
      t.position,
    ),
    check(
      'action_execution_position_valid',
      sql`${t.position} between 0 and 3`,
    ),
    check(
      'action_execution_status_valid',
      sql`${t.status} in ('PENDING','SUCCESS','FAILED','UNDONE','SKIPPED')`,
    ),
  ],
);
