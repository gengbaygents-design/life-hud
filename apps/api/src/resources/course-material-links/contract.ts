import { z } from 'zod';
import { ownedSchema, versionSchema } from '../core-contract';
const fields = {
  courseId: z.string().uuid(),
  fileId: z.string().uuid(),
  materialType: z.string().trim().max(255).nullable().optional(),
  label: z.string().trim().max(255).nullable().optional(),
};
export const createSchema = z.object(fields).strict();
export const updateSchema = z
  .object(fields)
  .partial()
  .extend({ id: z.string().uuid(), version: versionSchema })
  .strict();
export const recordSchema = ownedSchema.extend({
  courseId: z.string().uuid(),
  fileId: z.string().uuid(),
  materialType: z.string().nullable(),
  label: z.string().nullable(),
});
