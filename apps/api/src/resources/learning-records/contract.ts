import { z } from 'zod';
import {
  ownedSchema,
  titleSchema,
  descriptionSchema,
  versionSchema,
} from '../core-contract';
import { privacySchema, aiPolicySchema } from '../personal-contract';
export const createSchema = z
  .object({
    title: titleSchema,
    sourceKind: z
      .enum(['TEXT', 'URL', 'IMAGE', 'FILE', 'COURSE', 'ASSIGNMENT', 'OTHER'])
      .nullable()
      .optional(),
    sourceRef: descriptionSchema.optional(),
    reflection: descriptionSchema.optional(),
    questions: descriptionSchema.optional(),
    applications: descriptionSchema.optional(),
    projectIdeas: descriptionSchema.optional(),
    privacyLevel: privacySchema.optional(),
  })
  .strict();
export const learningFields = createSchema;
export const updateSchema = learningFields
  .partial()
  .extend({ id: z.string().uuid(), version: versionSchema })
  .strict();
export const linkedCreateSchema = createSchema.extend({
  projectId: z.string().uuid().nullable().optional(),
});
export const recordSchema = ownedSchema.extend({
  title: titleSchema,
  sourceKind: z
    .enum(['TEXT', 'URL', 'IMAGE', 'FILE', 'COURSE', 'ASSIGNMENT', 'OTHER'])
    .nullable(),
  sourceRef: descriptionSchema,
  reflection: descriptionSchema,
  questions: descriptionSchema,
  applications: descriptionSchema,
  projectIdeas: descriptionSchema,
  createdBy: z.string(),
  privacyLevel: privacySchema,
  aiPolicy: aiPolicySchema,
});
