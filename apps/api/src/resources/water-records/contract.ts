import { z } from 'zod';
import { ownedSchema, dateSchema, versionSchema } from '../core-contract';
import { privacySchema, aiPolicySchema } from '../personal-contract';
export const createSchema = z
  .object({
    recordedAt: dateSchema.optional(),
    amountMl: z.number().int().min(1).max(10000),
    privacyLevel: privacySchema.optional(),
  })
  .strict();
export const updateSchema = createSchema
  .partial()
  .extend({ id: z.string().uuid(), version: versionSchema })
  .strict();
export const recordSchema = ownedSchema.extend({
  recordedAt: dateSchema,
  amountMl: z.number().int(),
  privacyLevel: privacySchema,
  aiPolicy: aiPolicySchema,
});
