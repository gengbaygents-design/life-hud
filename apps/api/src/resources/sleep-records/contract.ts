import { z } from 'zod';
import {
  ownedSchema,
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
    sleepStart: dateSchema,
    wakeAt: dateSchema,
    quality: z.number().int().min(1).max(5).nullable().optional(),
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
  sleepStart: dateSchema,
  wakeAt: dateSchema,
  quality: z.number().int().nullable(),
  note: descriptionSchema,
  sourceType: sourceTypeSchema.nullable(),
  sourceId: z.string().uuid().nullable(),
  privacyLevel: privacySchema,
  aiPolicy: aiPolicySchema,
});
