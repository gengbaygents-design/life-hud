import { z } from 'zod';
export const privacySchema = z.enum([
  'NORMAL',
  'PRIVATE',
  'HIGH_PRIVATE',
  'VAULT',
]);
export const aiPolicySchema = z.enum([
  'ALWAYS',
  'WHEN_RELEVANT',
  'EXPLICIT_ONLY',
  'NEVER',
]);
export const moodSchema = z.enum([
  'HAPPY',
  'CALM',
  'TIRED',
  'ANXIOUS',
  'SAD',
  'OTHER',
]);
export const skillStateSchema = z.enum([
  'EXPOSED',
  'UNDERSTANDING',
  'PRACTICING',
  'INDEPENDENT',
  'TRANSFER',
  'PROVEN',
]);
export const evidenceTypeSchema = z.enum([
  'CONTACT',
  'UNDERSTANDING',
  'PRACTICE',
  'INDEPENDENT',
  'TRANSFER',
  'OUTPUT',
]);
export const sourceTypeSchema = z.enum([
  'TASK',
  'PROJECT',
  'GOAL',
  'COURSE',
  'ASSIGNMENT',
  'LEARNING_RECORD',
  'LEARNING_MISTAKE',
  'FILE',
]);
export const bodySchema = z
  .record(
    z.string().min(1).max(64),
    z.union([z.string().max(2000), z.number().finite(), z.boolean()]),
  )
  .refine(
    (v) => new TextEncoder().encode(JSON.stringify(v)).length <= 8192,
    '记录内容过长。',
  );
