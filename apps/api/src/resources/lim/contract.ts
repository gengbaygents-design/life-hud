import { z } from 'zod';

export const limSourceSchema = z
  .object({
    type: z.enum([
      'TASK',
      'ASSIGNMENT',
      'COURSE',
      'LEARNING_RECORD',
      'STATUS_MOMENT',
    ]),
    id: z.string().uuid(),
  })
  .strict();

export const turnInputSchema = z
  .object({
    conversationId: z.string().uuid(),
    requestId: z.string().uuid(),
    content: z.string().min(1).max(8000).refine(value=>value.trim().length>0),
    timeZone: z.string().max(100).default('Asia/Shanghai').refine(value=>{try{new Intl.DateTimeFormat('en',{timeZone:value});return true;}catch{return false;}}),
    sourceRoute: z.string().max(500).default(''),
    sourceEntity: limSourceSchema.nullable().default(null),
    shareRefs: z.array(limSourceSchema).max(5).default([]),
  })
  .strict();

export const turnIdSchema = z.object({ id: z.string().uuid() }).strict();

export const createConversationSchema = z.object({}).strict();

export const undoInputSchema = z
  .object({
    groupId: z.string().uuid(),
    undoToken: z.string().uuid(),
  })
  .strict();

const entityRefSchema = z.object({ type: z.string(), id: z.string().uuid() });

export const actionResultSchema = z
  .object({
    status: z.enum(['SUCCESS', 'PARTIAL', 'FAILED']),
    createdEntities: z.array(entityRefSchema),
    updatedEntities: z.array(entityRefSchema),
    warnings: z.array(z.string()),
    undoToken: z.string().uuid().nullable(),
  })
  .strict();

export const conversationSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
});

export const messageSchema = z.object({
  id: z.string().uuid(),
  role: z.enum(['user', 'assistant']),
  content: z.string(),
});

export const turnOutputSchema = z.object({
  id: z.string().uuid(),
  status: z.enum([
    'PROCESSING',
    'SUCCESS',
    'PARTIAL',
    'FAILED',
    'CLARIFICATION',
  ]),
  mode: z.enum(['EXECUTE', 'ASSIST', 'TALK']).nullable(),
  reply: z.string(),
  sourceMessageId: z.string().uuid().nullable(),
  result: actionResultSchema.nullable(),
  actions: z.array(
    z.object({
      type: z.string(),
      status: z.enum(['PENDING', 'SUCCESS', 'FAILED', 'UNDONE', 'SKIPPED']),
    }),
  ),
  createdAt: z.string(),
});

export const conversationOutputSchema = z.object({
  conversation: conversationSchema,
  messages: z.array(messageSchema),
  turns: z.array(turnOutputSchema),
});
