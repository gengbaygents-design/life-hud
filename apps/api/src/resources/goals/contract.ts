import { z } from 'zod';
import {
  ownedSchema,
  titleSchema,
  descriptionSchema,
  dateSchema,
  versionSchema,
} from '../core-contract';
const fields = {
  title: titleSchema,
  description: descriptionSchema.optional(),
  status: z.enum(['ACTIVE', 'COMPLETED', 'DROPPED']).optional(),
  horizon: z.string().max(100).nullable().optional(),
  targetDate: dateSchema.nullable().optional(),
};
export const createSchema = z.object(fields);
export const updateSchema = z
  .object(fields)
  .partial()
  .extend({ id: z.string().uuid(), version: versionSchema });
export const recordSchema = ownedSchema.extend({
  title: titleSchema,
  description: descriptionSchema,
  status: z.enum(['ACTIVE', 'COMPLETED', 'DROPPED']),
  horizon: z.string().nullable(),
  targetDate: dateSchema.nullable(),
});
