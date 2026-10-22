import { z } from 'zod';
import { ownedSchema, titleSchema } from '../core-contract';
export const recordSchema = ownedSchema.extend({
  key: z.string(),
  name: titleSchema,
  contentType: z.string(),
  size: z.number().int(),
});
