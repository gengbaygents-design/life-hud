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
    title: titleSchema,
    sourceType: sourceTypeSchema.nullable().optional(),
    sourceId: z.string().uuid().nullable().optional(),
    mistakeDescription: z.string().min(1).max(10000),
    correctUnderstanding: descriptionSchema.optional(),
    status: z.enum(['OPEN', 'REVIEWED', 'RESOLVED']).optional(),
    reviewedAt: dateSchema.nullable().optional(),
    privacyLevel: privacySchema.optional(),
  })
  .strict();
export const updateSchema = createSchema
  .partial()
  .extend({ id: z.string().uuid(), version: versionSchema })
  .strict();
export const recordSchema = ownedSchema.extend({
  title: titleSchema,
  sourceType: sourceTypeSchema.nullable(),
  sourceId: z.string().uuid().nullable(),
  mistakeDescription: z.string(),
  correctUnderstanding: descriptionSchema,
  status: z.enum(['OPEN', 'REVIEWED', 'RESOLVED']),
  reviewedAt: dateSchema.nullable(),
  privacyLevel: privacySchema,
  aiPolicy: aiPolicySchema,
});
