import { z } from 'zod';
import { ownedSchema, dateSchema, versionSchema } from '../core-contract';
import { prioritySchema } from '../reminder-rules/contract';

export const recordSchema = ownedSchema.extend({
  reminderRuleId: z.string().uuid().nullable(),
  title: z.string(),
  body: z.string().nullable(),
  scheduledFor: dateSchema,
  generatedAt: dateSchema,
  deliveredAt: dateSchema.nullable(),
  readAt: dateSchema.nullable(),
  dismissedAt: dateSchema.nullable(),
  priority: prioritySchema,
  status: z.enum(['DELIVERED', 'READ', 'DISMISSED']),
  silent: z.boolean(),
});

export const listSchema = z.object({}).strict();

export const stateSchema = z
  .object({
    id: z.string().uuid(),
    version: versionSchema,
    action: z.enum(['READ', 'DISMISS']),
  })
  .strict();
