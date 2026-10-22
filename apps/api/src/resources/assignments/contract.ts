import { z } from 'zod';
import {
  ownedSchema,
  titleSchema,
  descriptionSchema,
  dateSchema,
  versionSchema,
  idSchema,
} from '../core-contract';
const fields = {
  courseId: z.string().uuid(),
  title: titleSchema,
  description: descriptionSchema.optional(),
  publishedAt: dateSchema.nullable().optional(),
  dueAt: dateSchema.nullable().optional(),
  workState: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'DONE']).optional(),
};
export const createSchema = z
  .object({
    ...fields,
    createTask: z.boolean().default(true),
    estimatedMinutes: z.number().int().min(1).max(10080).nullable().optional(),
  })
  .strict();
export const updateSchema = z
  .object(fields)
  .partial()
  .extend({ id: z.string().uuid(), version: versionSchema })
  .strict();
export const actionSchema = idSchema
  .extend({ version: versionSchema })
  .strict();
export const recordSchema = ownedSchema.extend({
  courseId: z.string().uuid(),
  title: titleSchema,
  description: descriptionSchema,
  publishedAt: dateSchema.nullable(),
  dueAt: dateSchema.nullable(),
  workState: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'DONE']),
  submissionState: z.enum(['NOT_SUBMITTED', 'SUBMITTED']),
  submittedAt: dateSchema.nullable(),
  taskId: z.string().uuid().nullable(),
});
