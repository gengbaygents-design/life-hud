import { z } from 'zod';
import {
  ownedSchema,
  descriptionSchema,
  versionSchema,
} from '../core-contract';
import {
  privacySchema,
  aiPolicySchema,
  bodySchema,
} from '../personal-contract';
export const createSchema = z
  .object({
    startDate: z.string().date(),
    endDate: z.string().date().nullable().optional(),
    symptomsJson: bodySchema.nullable().optional(),
    note: descriptionSchema.optional(),
    privacyLevel: z.enum(['HIGH_PRIVATE', 'VAULT']).optional(),
  })
  .strict();
export const updateSchema = createSchema
  .partial()
  .extend({ id: z.string().uuid(), version: versionSchema })
  .strict();
export const recordSchema = ownedSchema.extend({
  startDate: z.string().date(),
  endDate: z.string().date().nullable(),
  symptomsJson: bodySchema.nullable(),
  note: descriptionSchema,
  privacyLevel: privacySchema,
  aiPolicy: aiPolicySchema,
});
