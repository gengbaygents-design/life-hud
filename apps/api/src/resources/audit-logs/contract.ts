import { z } from 'zod';
import { dateSchema, historyInputSchema } from '../core-contract';
export const listSchema = historyInputSchema;
export const auditSchema = z.object({
  id: z.string().uuid(),
  ownerId: z.string(),
  actorId: z.string(),
  entityType: z.string(),
  entityId: z.string().uuid(),
  action: z.string(),
  metadata: z.record(z.string(), z.unknown()),
  createdAt: dateSchema,
});
