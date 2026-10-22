import { z } from 'zod';

const isoOffsetDateTime = z.string().datetime({ offset: true });
const isoDateTime = z.string().datetime();

export const inputSchema = z
  .object({
    timeZone: z
      .string()
      .max(100)
      .default('Asia/Shanghai')
      .refine(
        (tz) => {
          try {
            new Intl.DateTimeFormat('en-US', { timeZone: tz });
            return true;
          } catch {
            return false;
          }
        },
        { message: 'timeZone must be a valid IANA time zone' },
      ),
  })
  .strict();

export const sourceRefSchema = z
  .object({
    type: z.enum(['TASK', 'ASSIGNMENT', 'CLASS_SESSION']),
    id: z.string().uuid(),
    version: z.number().int().positive(),
  })
  .strict();

export const itemSchema = z
  .object({
    type: z.enum(['TASK', 'ASSIGNMENT', 'CLASS']),
    title: z.string(),
    reason: z.string(),
    sourceRef: sourceRefSchema,
    state: z.string(),
    suggestedAction: z.enum(['OPEN_TASK', 'OPEN_COURSE', 'SUBMIT_ASSIGNMENT']),
    plannedStart: isoOffsetDateTime.nullable(),
    dueAt: isoOffsetDateTime.nullable(),
    endsAt: isoOffsetDateTime.nullable(),
    estimatedMinutes: z.number().int().positive().nullable(),
    courseId: z.string().uuid().nullable(),
    projectTitle: z.string().nullable(),
  })
  .strict();

const statusSnapshotSchema = z
  .object({
    id: z.string().uuid(),
    recordedAt: isoDateTime,
    mood: z.string().nullable(),
    customMood: z.string().nullable(),
    energy: z.number().int().min(1).max(5).nullable(),
    stress: z.number().int().min(1).max(5).nullable(),
    focus: z.number().int().min(1).max(5).nullable(),
  })
  .strict();

const voyageSnapshotSchema = z
  .object({
    id: z.string().uuid(),
    title: z.string(),
    projectTitle: z.string().nullable(),
  })
  .strict();

const alertSchema = z
  .object({
    code: z.string(),
    title: z.string(),
    sourceRef: sourceRefSchema.nullable(),
  })
  .strict();

export const recordSchema = z
  .object({
    upcomingReminder:z.object({id:z.string().uuid(),title:z.string(),scheduledAt:isoOffsetDateTime,priority:z.enum(['P0','P1'])}).nullable(),
    asOf: isoOffsetDateTime,
    timeZone: z.string(),
    currentContext: itemSchema.nullable(),
    nextAction: itemSchema.nullable(),
    fallbackAction: itemSchema.nullable(),
    upcomingClass: itemSchema.nullable(),
    todayItems: z.array(itemSchema).max(6),
    statusSnapshot: statusSnapshotSchema.nullable(),
    voyageSnapshot: voyageSnapshotSchema.nullable(),
    alerts: z.array(alertSchema).max(3),
    emptyMessage: z.string().nullable(),
    nextRefreshAt: isoDateTime,
  })
  .strict();
