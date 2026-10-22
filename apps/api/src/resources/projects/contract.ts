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
  status: z.enum(['ACTIVE', 'COMPLETED', 'ARCHIVED']).optional(),
  startAt: dateSchema.nullable().optional(),
  endAt: dateSchema.nullable().optional(),
  voyageId: z.string().uuid().nullable().optional(),
};
export const createSchema = z.object(fields);
export const updateSchema = z
  .object(fields)
  .partial()
  .extend({ id: z.string().uuid(), version: versionSchema });
export const recordSchema = ownedSchema.extend({
  title: titleSchema,
  description: descriptionSchema,
  status: z.enum(['ACTIVE', 'COMPLETED', 'ARCHIVED']),
  startAt: dateSchema.nullable(),
  endAt: dateSchema.nullable(),
  voyageId: z.string().uuid().nullable(),
});
