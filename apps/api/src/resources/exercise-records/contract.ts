import { z } from 'zod';
import {
  ownedSchema,
  titleSchema,
  descriptionSchema,
  dateSchema,
  versionSchema,
} from '../core-contract';
import {
  privacySchema,
  aiPolicySchema,
  sourceTypeSchema,
} from '../personal-contract';
export const createSchema = z
  .object({
    startedAt: dateSchema,
    endedAt: dateSchema.nullable().optional(),
    activityType: titleSchema,
    durationMinutes: z.number().int().min(1).max(4320).nullable().optional(),
    note: descriptionSchema.optional(),
    sourceType: sourceTypeSchema.nullable().optional(),
    sourceId: z.string().uuid().nullable().optional(),
    privacyLevel: privacySchema.optional(),
  })
  .strict();
export const updateSchema = createSchema
  .partial()
  .extend({ id: z.string().uuid(), version: versionSchema })
  .strict();
export const recordSchema = ownedSchema.extend({
  startedAt: dateSchema,
  endedAt: dateSchema.nullable(),
  activityType: titleSchema,
  durationMinutes: z.number().int().nullable(),
  note: descriptionSchema,
  sourceType: sourceTypeSchema.nullable(),
  sourceId: z.string().uuid().nullable(),
  privacyLevel: privacySchema,
  aiPolicy: aiPolicySchema,
});
