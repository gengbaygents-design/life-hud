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
  parentVoyageId: z.string().uuid().nullable().optional(),
  voyageType: z.literal('UNIVERSITY').optional(),
  primaryContext: z.string().trim().min(1).max(100).optional(),
  status: z.enum(['ACTIVE', 'COMPLETED', 'ARCHIVED']).optional(),
  startAt: dateSchema,
  endAt: dateSchema.nullable().optional(),
  summary: descriptionSchema.optional(),
  visualSeed: z.string().max(100).nullable().optional(),
};
export const createSchema = z.object(fields);
export const updateSchema = z
  .object(fields)
  .partial()
  .extend({ id: z.string().uuid(), version: versionSchema });
export const recordSchema = ownedSchema.extend({
  title: titleSchema,
  parentVoyageId: z.string().uuid().nullable(),
  voyageType: z.literal('UNIVERSITY'),
  primaryContext: z.string(),
  status: z.enum(['ACTIVE', 'COMPLETED', 'ARCHIVED']),
  startAt: dateSchema,
  endAt: dateSchema.nullable(),
  summary: descriptionSchema,
  visualSeed: z.string().nullable(),
});
