import { z } from 'zod';
import {
  ownedSchema,
  titleSchema,
  dateSchema,
  versionSchema,
} from '../core-contract';
const fields = {
  voyageId: z.string().uuid(),
  name: titleSchema,
  startAt: dateSchema,
  endAt: dateSchema,
  status: z.enum(['ACTIVE', 'COMPLETED', 'ARCHIVED']).optional(),
};
export const createSchema = z.object(fields).strict();
export const updateSchema = z
  .object(fields)
  .partial()
  .extend({ id: z.string().uuid(), version: versionSchema })
  .strict();
export const recordSchema = ownedSchema.extend({
  voyageId: z.string().uuid(),
  name: titleSchema,
  startAt: dateSchema,
  endAt: dateSchema,
  status: z.enum(['ACTIVE', 'COMPLETED', 'ARCHIVED']),
});
