import { z } from 'zod';
import { ownedSchema, dateSchema, versionSchema } from '../core-contract';

const fields = {
  body: z
    .string()
    .max(30000)
    .refine((s) => s.trim().length > 0, {
      message: 'body must contain non-whitespace content',
    }),
  recordedAt: dateSchema.optional(),
  voyageId: z.string().uuid().nullable().optional(),
  privacyLevel: z.enum(['PRIVATE', 'HIGH_PRIVATE', 'VAULT']).optional(),
  aiAccessPolicy: z
    .enum(['ALWAYS', 'WHEN_RELEVANT', 'EXPLICIT_ONLY', 'NEVER'])
    .optional(),
};

export const createSchema = z.object(fields).strict();

export const updateSchema = z
  .object(fields)
  .partial()
  .extend({
    id: z.string().uuid(),
    version: versionSchema,
  })
  .strict();

export const recordSchema = ownedSchema.extend({
  body: fields.body,
  recordedAt: dateSchema,
  voyageId: z.string().uuid().nullable(),
  privacyLevel: z.enum(['PRIVATE', 'HIGH_PRIVATE', 'VAULT']),
  aiAccessPolicy: z.enum(['ALWAYS', 'WHEN_RELEVANT', 'EXPLICIT_ONLY', 'NEVER']),
});
