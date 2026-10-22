import { z } from 'zod';
import { ownedSchema, dateSchema, versionSchema } from '../core-contract';

export const prioritySchema = z.enum(['P0', 'P1', 'P2', 'P3']);
export const sourceSchema = z.enum(['TASK', 'ASSIGNMENT', 'EXAM']);

const timeZoneSchema = z
  .string()
  .max(100)
  .refine((tz) => {
    if(/^[+-]/.test(tz))return false;
    try {
      new Intl.DateTimeFormat('en', { timeZone: tz });
      return true;
    } catch {
      return false;
    }
  }, 'Invalid IANA time zone');

const hhmmSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid HH:mm time');

export const createSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    scheduledAt: dateSchema,
    sourceType: sourceSchema.nullable().optional(),
    sourceId: z.string().uuid().nullable().optional(),
    priority: prioritySchema.default('P2'),
    timeZone: timeZoneSchema.default('Asia/Shanghai'),
    quietStart: hhmmSchema.default('23:30'),
    quietEnd: hhmmSchema.default('07:30'),
    quietHoursPolicy: z.enum(['DEFER', 'SILENT']).default('DEFER'),
    confirmCritical: z.boolean().default(false),
  })
  .strict()
  .superRefine((value, ctx) => {
    const hasType = value.sourceType != null;
    const hasId = value.sourceId != null;
    if (hasType !== hasId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'sourceType and sourceId must be set together',
      });
    }
  });

export const listSchema = z.object({}).strict();

export const cancelSchema = z
  .object({
    id: z.string().uuid(),
    version: versionSchema,
  })
  .strict();

export const recordSchema = ownedSchema.extend({
  title: z.string(),
  sourceType: sourceSchema.nullable(),
  sourceId: z.string().uuid().nullable(),
  scheduleType: z.literal('ONCE'),
  scheduledAt: dateSchema,
  cronExpression: z.null(),
  priority: prioritySchema,
  timeZone: z.string(),
  quietStart: z.string(),
  quietEnd: z.string(),
  quietHoursPolicy: z.enum(['DEFER', 'SILENT']),
  status: z.enum(['ACTIVE', 'FIRED', 'CANCELLED']),
  lastTriggeredAt: dateSchema.nullable(),
  nextTriggerAt: dateSchema.nullable(),
});
