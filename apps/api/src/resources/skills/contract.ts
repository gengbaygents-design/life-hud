import { z } from 'zod';
import {
  ownedSchema,
  titleSchema,
  descriptionSchema,
  versionSchema,
} from '../core-contract';
import {
  privacySchema,
  aiPolicySchema,
  skillStateSchema,
} from '../personal-contract';
export const createSchema = z
  .object({
    name: titleSchema,
    state: skillStateSchema.optional(),
    description: descriptionSchema.optional(),
    privacyLevel: privacySchema.optional(),
  })
  .strict();
export const updateSchema = createSchema
  .partial()
  .extend({
    id: z.string().uuid(),
    version: versionSchema,
    confirmState: z.boolean().optional(),
  })
  .strict();
export const recordSchema = ownedSchema.extend({
  name: titleSchema,
  state: skillStateSchema,
  description: descriptionSchema,
  privacyLevel: privacySchema,
  aiPolicy: aiPolicySchema,
});
