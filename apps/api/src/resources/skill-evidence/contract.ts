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
  evidenceTypeSchema,
  sourceTypeSchema,
} from '../personal-contract';
export const createSchema = z
  .object({
    skillId: z.string().uuid(),
    evidenceType: evidenceTypeSchema,
    sourceType: sourceTypeSchema,
    sourceId: z.string().uuid(),
    note: descriptionSchema.optional(),
    observedAt: dateSchema.optional(),
    privacyLevel: privacySchema.optional(),
  })
  .strict();
export const evidenceFields = createSchema;
export const updateSchema = evidenceFields
  .partial()
  .extend({ id: z.string().uuid(), version: versionSchema })
  .strict();
export const confirmedCreateSchema = createSchema.extend({
  confirmEvidence: z.boolean().optional(),
});
export const recordSchema = ownedSchema.extend({
  skillId: z.string().uuid(),
  evidenceType: evidenceTypeSchema,
  sourceType: sourceTypeSchema,
  sourceId: z.string().uuid(),
  note: descriptionSchema,
  observedAt: dateSchema,
  privacyLevel: privacySchema,
  aiPolicy: aiPolicySchema,
});
