import { z } from 'zod';
import { sourceTypeSchema } from './contract';
import { dateSchema, versionSchema } from '../core-contract';
export const historySchema = z.object({
  items: z
    .array(
      z.object({
        sourceType: z.enum([...sourceTypeSchema.options, 'ARCHIVE_ENTRY']),
        sourceId: z.string().uuid(),
        title: z.string(),
        at: dateSchema,
        excerpt: z.string().nullable(),
        version: versionSchema,
        privacyLevel: z.enum(['NORMAL', 'PRIVATE', 'HIGH_PRIVATE', 'VAULT']),
        links: z.array(
          z.object({
            sourceType: sourceTypeSchema,
            sourceId: z.string().uuid(),
            title: z.string(),
            available: z.boolean(),
          }),
        ),
      }),
    )
    .max(100),
  voyages: z.array(
    z.object({ id: z.string().uuid(), title: z.string(), status: z.string() }),
  ),
  semesters: z.array(
    z.object({
      id: z.string().uuid(),
      voyageId: z.string().uuid(),
      title: z.string(),
      status: z.string(),
    }),
  ),
});
