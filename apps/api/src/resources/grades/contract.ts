import { z } from 'zod';
import { ownedSchema, dateSchema, versionSchema } from '../core-contract';
const fields = {
  courseId: z.string().uuid(),
  assessmentType: z.string().trim().max(255).nullable().optional(),
  reference: z.string().trim().max(255).nullable().optional(),
  score: z.number().min(0).max(1000000).nullable().optional(),
  maxScore: z.number().positive().max(1000000).nullable().optional(),
  weight: z.number().min(0).max(1).nullable().optional(),
  recordedAt: dateSchema,
};
export const createSchema = z.object(fields).strict();
export const updateSchema = z
  .object(fields)
  .partial()
  .extend({ id: z.string().uuid(), version: versionSchema })
  .strict();
export const recordSchema = ownedSchema.extend({
  courseId: z.string().uuid(),
  assessmentType: z.string().nullable(),
  reference: z.string().nullable(),
  score: z.number().nullable(),
  maxScore: z.number().nullable(),
  weight: z.number().nullable(),
  recordedAt: dateSchema,
});
