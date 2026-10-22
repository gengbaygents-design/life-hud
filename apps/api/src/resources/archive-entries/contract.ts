import { z } from 'zod';
import { dateSchema, ownedSchema, versionSchema } from '../core-contract';

const daySchema = z.string().date();
const timeZoneSchema = z
  .string()
  .max(100)
  .refine((s) => {
    if(/^[+-]/.test(s))return false;
    try {
      new Intl.DateTimeFormat(undefined, { timeZone: s });
      return true;
    } catch {
      return false;
    }
  });

export const sourceTypeSchema = z.enum([
  'TASK',
  'ASSIGNMENT',
  'EXAM',
  'PROJECT',
  'VOYAGE',
  'COURSE',
  'STATUS_MOMENT',
  'LEARNING_RECORD',
  'CLASS_SESSION',
  'CAPTAIN_LOG',
]);

export const linkSchema = z
  .object({
    sourceType: sourceTypeSchema,
    sourceId: z.string().uuid(),
    relationType: z.string().max(80).nullable().optional(),
  })
  .strict();

export const createSchema = z
  .object({
    title: z.string().trim().min(1).max(200).default('这一刻'),
    summary: z.string().max(10000).nullable().optional(),
    archiveType: z.enum(['MOMENT', 'PERIOD']).default('MOMENT'),
    recordedAt: dateSchema.optional(),
    periodStart: dateSchema.nullable().optional(),
    periodEnd: dateSchema.nullable().optional(),
    voyageId: z.string().uuid().nullable().optional(),
    privacyLevel: z
      .enum(['PRIVATE', 'HIGH_PRIVATE', 'VAULT'])
      .default('PRIVATE'),
    links: z.array(linkSchema).max(10).default([]),
  })
  .strict();

export const recordSchema = ownedSchema.extend({
  title: z.string().min(1).max(200),
  summary: z.string().max(10000).nullable(),
  archiveType: z.enum(['MOMENT', 'PERIOD']),
  recordedAt: dateSchema,
  periodStart: dateSchema.nullable(),
  periodEnd: dateSchema.nullable(),
  voyageId: z.string().uuid().nullable(),
  privacyLevel: z.enum(['PRIVATE', 'HIGH_PRIVATE', 'VAULT']),
});

export const querySchema = z
  .object({
    day: daySchema.optional(),
    timeZone: timeZoneSchema.default('Asia/Shanghai'),
    q: z.string().trim().max(100).default(''),
    voyageId: z.string().uuid().optional(),
    semesterId: z.string().uuid().optional(),
    includeSensitive: z
      .union([z.boolean(), z.literal('true'), z.literal('false')])
      .transform((value) => value === true || value === 'true')
      .default(false),
  })
  .strict();

export const removeSchema = z
  .object({
    id: z.string().uuid(),
    version: versionSchema,
    confirm: z.literal(true),
  })
  .strict();

export type ArchiveSourceType = z.infer<typeof sourceTypeSchema>;
export type ArchiveLink = z.infer<typeof linkSchema>;
export type ArchiveEntryCreate = z.infer<typeof createSchema>;
export type ArchiveEntryRecord = z.infer<typeof recordSchema>;
export type ArchiveEntryQuery = z.infer<typeof querySchema>;
export type ArchiveEntryRemove = z.infer<typeof removeSchema>;
