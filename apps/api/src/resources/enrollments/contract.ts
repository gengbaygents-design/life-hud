import { z } from 'zod';
import { ownedSchema, versionSchema } from '../core-contract';
const fields = {
  courseId: z.string().uuid(),
  status: z.enum(['ENROLLED', 'COMPLETED', 'WITHDRAWN']).optional(),
};
export const createSchema = z.object(fields).strict();
export const updateSchema = z
  .object(fields)
  .partial()
  .extend({ id: z.string().uuid(), version: versionSchema })
  .strict();
export const recordSchema = ownedSchema.extend({
  courseId: z.string().uuid(),
  status: z.enum(['ENROLLED', 'COMPLETED', 'WITHDRAWN']),
});
