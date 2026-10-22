import { z } from 'zod';
import {
  ownedSchema,
  titleSchema,
  descriptionSchema,
  versionSchema,
} from '../core-contract';
const fields = { name: titleSchema, note: descriptionSchema.optional() };
export const createSchema = z.object(fields).strict();
export const updateSchema = z
  .object(fields)
  .partial()
  .extend({ id: z.string().uuid(), version: versionSchema })
  .strict();
export const recordSchema = ownedSchema.extend({
  name: titleSchema,
  note: descriptionSchema,
});
