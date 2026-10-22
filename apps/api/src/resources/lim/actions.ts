import { z } from 'zod';
import { taskCreateSchema, taskUpdateSchema } from '../tasks/contract';
import { createSchema as assignmentCreate } from '../assignments/contract';
import { createSchema as momentCreate } from '../status-moments/contract';
import { createSchema as learningCreate } from '../learning-records/contract';
import { dateSchema, versionSchema } from '../core-contract';
import { createSchema as captainCreate } from '../captain-logs/contract';
const target = {
  taskId: z.union([z.string().uuid(), z.literal('$previousTask')]),
  expectedVersion: versionSchema.optional(),
};
const academicTarget = {
  assignmentId: z.string().uuid(),
  expectedVersion: versionSchema.optional(),
};
const schemas = {
  CREATE_REMINDER: z.object({title:z.string().trim().min(1).max(200),scheduledAt:dateSchema,sourceType:z.enum(['TASK','ASSIGNMENT','EXAM']).nullable().optional(),sourceId:z.string().uuid().nullable().optional(),priority:z.enum(['P1','P2','P3']).optional()}).strict(),
  CREATE_CAPTAIN_LOG: captainCreate.pick({body:true}).strict(),
  REMEMBER_MOMENT: z.object({title:z.string().trim().min(1).max(200).optional(),summary:z.string().max(10000).nullable().optional()}).strict(),
  QUERY_CURRENT_CONTEXT: z.object({}).strict(),
  QUERY_TIMETABLE: z.object({}).strict(),
  CREATE_TASK: taskCreateSchema
    .omit({ sourceType: true, sourceId: true })
    .strict(),
  UPDATE_TASK: taskUpdateSchema
    .omit({ id: true, version: true, sourceType: true, sourceId: true })
    .extend(target)
    .strict(),
  COMPLETE_TASK: z.object(target).strict(),
  DELAY_TASK: z.object({ ...target, newPlannedStart: dateSchema }).strict(),
  CREATE_ASSIGNMENT: assignmentCreate
    .omit({ workState: true, createTask: true, publishedAt: true })
    .strict(),
  UPDATE_ASSIGNMENT_DUE_DATE: z
    .object({ ...academicTarget, newDueAt: dateSchema })
    .strict(),
  MARK_ASSIGNMENT_DONE: z.object(academicTarget).strict(),
  MARK_ASSIGNMENT_SUBMITTED: z.object(academicTarget).strict(),
  RECORD_STATUS: momentCreate
    .pick({
      mood: true,
      customMood: true,
      energy: true,
      stress: true,
      focus: true,
      note: true,
    })
    .strict(),
  CREATE_LEARNING_RECORD: learningCreate
    .pick({
      title: true,
      sourceKind: true,
      sourceRef: true,
      reflection: true,
      applications: true,
    })
    .strict(),
};
export const actionTypes = Object.keys(schemas) as (keyof typeof schemas)[];
const variant = <K extends keyof typeof schemas>(type: K) =>
  z
    .object({
      type: z.literal(type),
      confidence: z.enum(['HIGH', 'MEDIUM', 'LOW']),
      payload: schemas[type],
    })
    .strict();
export const actionSchema = z.discriminatedUnion('type', [
  variant('CREATE_REMINDER'),
  variant('CREATE_CAPTAIN_LOG'),
  variant('REMEMBER_MOMENT'),
  variant('QUERY_CURRENT_CONTEXT'),
  variant('QUERY_TIMETABLE'),
  variant('CREATE_TASK'),
  variant('UPDATE_TASK'),
  variant('COMPLETE_TASK'),
  variant('DELAY_TASK'),
  variant('CREATE_ASSIGNMENT'),
  variant('UPDATE_ASSIGNMENT_DUE_DATE'),
  variant('MARK_ASSIGNMENT_DONE'),
  variant('MARK_ASSIGNMENT_SUBMITTED'),
  variant('RECORD_STATUS'),
  variant('CREATE_LEARNING_RECORD'),
]);
export const proposalSchema = z
  .object({
    mode: z.enum(['EXECUTE', 'ASSIST', 'TALK']),
    reply: z.string().max(1200),
    clarification: z.string().max(300).nullable(),
    actions: z.array(actionSchema).max(4),
  })
  .strict();
export type Action = {
  type: keyof typeof schemas;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  payload: Record<string, unknown>;
};
export function parseAction(input: unknown): Action {
  const action = actionSchema.parse(input) as Action;
  return { ...action, payload: schemas[action.type].parse(action.payload) };
}
export function actionRisk(type: Action['type']) {
  return type.startsWith('QUERY_') ? ('R0' as const) : ('R1' as const);
}
