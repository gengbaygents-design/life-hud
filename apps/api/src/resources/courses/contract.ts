import { z } from 'zod';
import { ownedSchema, titleSchema, versionSchema } from '../core-contract';
const fields = {
  semesterId: z.string().uuid(),
  name: titleSchema,
  code: z.string().trim().max(255).nullable().optional(),
  teacher: z.string().trim().max(255).nullable().optional(),
  credits: z.number().min(0).max(100).nullable().optional(),
  status: z.enum(['ACTIVE', 'COMPLETED', 'ARCHIVED']).optional(),
};
export const createSchema = z.object(fields).strict();
export const updateSchema = z
  .object(fields)
  .partial()
  .extend({ id: z.string().uuid(), version: versionSchema })
  .strict();
export const recordSchema = ownedSchema.extend({
  semesterId: z.string().uuid(),
  name: titleSchema,
  code: z.string().nullable(),
  teacher: z.string().nullable(),
  credits: z.number().nullable(),
  status: z.enum(['ACTIVE', 'COMPLETED', 'ARCHIVED']),
});
