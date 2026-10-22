import { z } from 'zod';
import {
  ownedSchema,
  titleSchema,
  dateSchema,
  versionSchema,
} from '../core-contract';
const fields = {
  courseId: z.string().uuid(),
  title: titleSchema,
  examType: z.string().trim().max(255).nullable().optional(),
  startAt: dateSchema,
  endAt: dateSchema.nullable().optional(),
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
  title: titleSchema,
  examType: z.string().nullable(),
  startAt: dateSchema,
  endAt: dateSchema.nullable(),
  placeId: z.string().uuid().nullable(),
});
