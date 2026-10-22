import { z } from 'zod';
export const dateSchema = z.string().datetime({ offset: true });
export const titleSchema = z.string().trim().min(1).max(255);
export const descriptionSchema = z.string().max(10000).nullable();
export const versionSchema = z.number().int().positive();
export const idSchema = z.object({ id: z.string().uuid() });
export const confirmSchema = idSchema.extend({
  version: versionSchema,
  confirm: z.literal(true),
});
export const emptySchema = z.object({}).default({});
export const ownedSchema = idSchema.extend({
  ownerId: z.string(),
  version: versionSchema,
  createdAt: dateSchema,
  updatedAt: dateSchema,
  deletedAt: dateSchema.nullable(),
});
export const entityTypeSchema = z.enum([
  'TASK',
  'PROJECT',
  'GOAL',
  'VOYAGE',
  'COURSE',
  'ASSIGNMENT',
  'FILE',
  'PLACE',
  'LEARNING_RECORD',
  'LEARNING_MISTAKE',
  'SKILL',
]);
export const historyInputSchema = z.object({
  entityType: z
    .enum([
      'TASK',
      'PROJECT',
      'GOAL',
      'VOYAGE',
      'SEMESTER',
      'COURSE',
      'ENROLLMENT',
      'CLASS_SESSION',
      'ASSIGNMENT',
      'EXAM',
      'GRADE',
      'COURSE_MATERIAL_LINK',
      'PLACE',
      'FILE',
      'STATUS_MOMENT',
      'SLEEP_RECORD',
      'WATER_RECORD',
      'EXERCISE_RECORD',
      'CYCLE_RECORD',
      'LEARNING_RECORD',
      'LEARNING_MISTAKE',
      'SKILL',
      'SKILL_EVIDENCE',
    ])
    .optional(),
  entityId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).max(100000).default(0),
});
