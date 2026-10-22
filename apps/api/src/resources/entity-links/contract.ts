import { z } from 'zod';
import { ownedSchema, entityTypeSchema } from '../core-contract';
export const createSchema = z.object({
  fromType: entityTypeSchema,
  fromId: z.string().uuid(),
  relationType: z.enum(['BELONGS_TO', 'RELATED_TO', 'APPLIED_TO']),
  toType: entityTypeSchema,
  toId: z.string().uuid(),
  metadata: z
    .record(z.string(), z.unknown())
    .nullable()
    .optional()
    .refine(
      (v) => !v || new TextEncoder().encode(JSON.stringify(v)).length <= 4096,
      'Metadata too large',
    ),
});
export const listSchema = z.object({
  entityType: entityTypeSchema.optional(),
  entityId: z.string().uuid().optional(),
});
export const recordSchema = ownedSchema.extend({
  fromType: z.string(),
  fromId: z.string().uuid(),
  relationType: z.string(),
  toType: z.string(),
  toId: z.string().uuid(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
});
