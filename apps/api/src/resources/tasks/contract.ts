import { z } from 'zod';
import {
  ownedSchema,
  idSchema,
  versionSchema,
  dateSchema,
  titleSchema,
  descriptionSchema,
} from '../core-contract';
export const statusSchema = z.enum([
  'INBOX',
  'PLANNED',
  'ACTIVE',
  'COMPLETED',
  'DELAYED',
  'DROPPED',
]);
export const importanceSchema = z.enum(['LOW', 'NORMAL', 'HIGH']);
const fields = {
  title: titleSchema,
  description: descriptionSchema.optional(),
  importance: importanceSchema.optional(),
  plannedStart: dateSchema.nullable().optional(),
  plannedEnd: dateSchema.nullable().optional(),
  dueAt: dateSchema.nullable().optional(),
  estimatedMinutes: z.number().int().min(1).max(10080).nullable().optional(),
  projectId: z.string().uuid().nullable().optional(),
  sourceType: z.enum(['PROJECT', 'GOAL', 'VOYAGE']).nullable().optional(),
  sourceId: z.string().uuid().nullable().optional(),
};
export const taskCreateSchema = z.object(fields);
export const taskUpdateSchema = z
  .object(fields)
  .partial()
  .extend({ id: z.string().uuid(), version: versionSchema });
export const taskSchema = ownedSchema.extend({
  title: titleSchema,
  description: descriptionSchema,
  status: statusSchema,
  importance: importanceSchema,
  plannedStart: dateSchema.nullable(),
  plannedEnd: dateSchema.nullable(),
  dueAt: dateSchema.nullable(),
  estimatedMinutes: z.number().int().nullable(),
  actualMinutes: z.number().int().nullable(),
  projectId: z.string().uuid().nullable(),
  sourceType: z.enum(['PROJECT', 'GOAL', 'VOYAGE', 'ASSIGNMENT']).nullable(),
  sourceId: z.string().uuid().nullable(),
  completedAt: dateSchema.nullable(),
});
export const taskIdSchema = idSchema;
export const taskActionSchema = idSchema.extend({ version: versionSchema });
export const taskConfirmSchema = taskActionSchema.extend({
  confirm: z.literal(true),
});
export const taskDelaySchema = taskActionSchema.extend({
  plannedStart: dateSchema,
  plannedEnd: dateSchema.nullable().optional(),
});
export const taskCompleteSchema = taskActionSchema.extend({
  actualMinutes: z.number().int().min(0).max(100000).nullable().optional(),
});
export const taskListSchema = z.object({
  status: statusSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).max(100000).default(0),
});
export const boardInputSchema = z.object({
  timeZone: z
    .string()
    .max(100)
    .default('Asia/Shanghai')
    .refine((value) => {
      try {
        new Intl.DateTimeFormat('en', { timeZone: value });
        return true;
      } catch {
        return false;
      }
    }, 'Invalid time zone'),
  availableMinutes: z.coerce.number().int().min(1).max(1440).optional(),
});
export const boardSchema = z.object({
  now: z.array(z.object({ task: taskSchema, reason: z.string() })),
  today: z.array(taskSchema),
  inbox: z.array(taskSchema),
});
export type TaskCreate = z.infer<typeof taskCreateSchema>;
export type TaskUpdate = z.infer<typeof taskUpdateSchema>;
