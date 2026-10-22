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
  bodySchema,
  moodSchema,
  sourceTypeSchema,
} from '../personal-contract';
export const createSchema = z
  .object({
    recordedAt: dateSchema.optional(),
    mood: moodSchema.nullable().optional(),
    customMood: descriptionSchema.optional(),
    energy: z.number().int().min(1).max(5).nullable().optional(),
    stress: z.number().int().min(1).max(5).nullable().optional(),
    focus: z.number().int().min(1).max(5).nullable().optional(),
    bodyStateJson: bodySchema.nullable().optional(),
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
  recordedAt: dateSchema,
  mood: moodSchema.nullable(),
  customMood: descriptionSchema,
  energy: z.number().int().nullable(),
  stress: z.number().int().nullable(),
  focus: z.number().int().nullable(),
  bodyStateJson: bodySchema.nullable(),
  note: descriptionSchema,
  sourceType: sourceTypeSchema.nullable(),
  sourceId: z.string().uuid().nullable(),
  privacyLevel: privacySchema,
  aiPolicy: aiPolicySchema,
});
