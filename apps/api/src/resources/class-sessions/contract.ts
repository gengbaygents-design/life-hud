import { z } from 'zod';
import { ownedSchema, versionSchema } from '../core-contract';
const fields = {
  courseId: z.string().uuid(),
  specificDate: z.string().date(),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  timeZone: z
    .string()
    .max(100)
    .refine((v) => {
      try {
        new Intl.DateTimeFormat('en', { timeZone: v });
        return true;
      } catch {
        return false;
      }
    })
    .optional(),
  placeId: z.string().uuid().nullable().optional(),
};
export const createSchema = z.object(fields).strict();
export const updateSchema = z
  .object(fields)
  .partial()
  .extend({ id: z.string().uuid(), version: versionSchema })
  .strict();
export const recordSchema = ownedSchema.extend({
  courseId: z.string().uuid(),
  specificDate: z.string().date(),
  startTime: z.string(),
  endTime: z.string(),
  timeZone: z.string(),
  placeId: z.string().uuid().nullable(),
});
