import { z } from 'zod';
import { dateSchema, historyInputSchema } from '../core-contract';
export const listSchema = historyInputSchema;
export const eventSchema = z.object({
  id: z.string().uuid(),
  ownerId: z.string(),
  entityType: z.string(),
  entityId: z.string().uuid(),
  eventType: z.string(),
  payload: z.record(z.string(), z.unknown()),
  createdAt: dateSchema,
  processedAt: dateSchema.nullable(),
  attempts: z.number().int(),
  availableAt: dateSchema,
  lastError: z.string().nullable(),
});
