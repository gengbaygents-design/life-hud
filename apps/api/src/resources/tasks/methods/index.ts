import { and, desc, eq, isNull, or, sql } from 'drizzle-orm';
import { rawDb, type Task } from '@/db';
import { tasks } from '../tasks.schema';
import { entityLinks } from '../../entity-links/entity-links.schema';
import { auditLogs } from '../../audit-logs/audit-logs.schema';
import {
  taskActionSchema,
  taskCompleteSchema,
  taskConfirmSchema,
  taskCreateSchema,
  taskDelaySchema,
  taskIdSchema,
  taskListSchema,
  taskUpdateSchema,
  boardInputSchema,
  type TaskCreate,
} from '../contract';
import {
  assertOwned,
  conflict,
  dateOrNull,
  domainWrite,
  expectVersion,
  invalid,
  notFound,
  recordChange,
  toWire,
  validRange,
  type CoreTx,
} from '../../core-methods';
import { ensureUniversityVoyageIn } from '../../voyages/methods';
import {selectClockNow} from '../../core-clock';
import { buildBoard } from './recommend';

async function load(tx: CoreTx, ownerId: string, id: string) {
  const [task] = await tx
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.id, id),
        eq(tasks.ownerId, ownerId),
        isNull(tasks.deletedAt),
      ),
    )
    .for('update');
  if (!task) throw notFound();
  return task;
}
async function validateReferences(
  tx: CoreTx,
  ownerId: string,
  task: Pick<Task, 'projectId' | 'sourceType' | 'sourceId'>,
) {
  if (task.projectId) await assertOwned(tx, ownerId, 'PROJECT', task.projectId);
  if (Boolean(task.sourceType) !== Boolean(task.sourceId))
    invalid('来源类型与来源记录须同时提供。');
  if (task.sourceType && task.sourceType !== 'ASSIGNMENT' && task.sourceId)
    await assertOwned(tx, ownerId, task.sourceType, task.sourceId);
}
function snapshot(task: Task) {
  return {
    status: task.status,
    version: task.version,
    plannedStart: task.plannedStart?.toISOString() ?? null,
    plannedEnd: task.plannedEnd?.toISOString() ?? null,
    dueAt: task.dueAt?.toISOString() ?? null,
    completedAt: task.completedAt?.toISOString() ?? null,
    projectId: task.projectId,
  };
}
async function syncProject(tx: CoreTx, task: Task) {
  await tx
    .update(entityLinks)
    .set({
      deletedAt: new Date(),
      updatedAt: new Date(),
      version: sql`${entityLinks.version}+1`,
    })
    .where(
      and(
        eq(entityLinks.ownerId, task.ownerId),
        eq(entityLinks.fromType, 'TASK'),
        eq(entityLinks.fromId, task.id),
        eq(entityLinks.toType, 'PROJECT'),
        eq(entityLinks.relationType, 'BELONGS_TO'),
        isNull(entityLinks.deletedAt),
      ),
    );
  if (task.projectId && !task.deletedAt)
    await tx
      .insert(entityLinks)
      .values({
        ownerId: task.ownerId,
        fromType: 'TASK',
        fromId: task.id,
        relationType: 'BELONGS_TO',
        toType: 'PROJECT',
        toId: task.projectId,
      });
}
export async function createTask(
  ownerId: string,
  input: unknown,
  options?: { trustedId: string },
) {
  const data = taskCreateSchema.parse(input);
  return domainWrite(async (tx) => {
    await ensureUniversityVoyageIn(tx, ownerId);
    const plannedStart = dateOrNull(data.plannedStart),
      plannedEnd = dateOrNull(data.plannedEnd);
    validRange(plannedStart, plannedEnd);
    const references = {
      projectId: data.projectId ?? null,
      sourceType: data.sourceType ?? null,
      sourceId: data.sourceId ?? null,
    };
    await validateReferences(tx, ownerId, references);
    const [task] = await tx
      .insert(tasks)
      .values({
        ownerId,
        ...(options
          ? { id: taskIdSchema.parse({ id: options.trustedId }).id }
          : {}),
        title: data.title,
        description: data.description ?? null,
        importance: data.importance ?? 'NORMAL',
        plannedStart,
        plannedEnd,
        dueAt: dateOrNull(data.dueAt),
        estimatedMinutes: data.estimatedMinutes ?? null,
        ...references,
        status: plannedStart || data.dueAt ? 'PLANNED' : 'INBOX',
      })
      .returning();
    if (task.projectId) await syncProject(tx, task);
    await recordChange(
      tx,
      ownerId,
      'TASK',
      task.id,
      'TaskCreated',
      { after: snapshot(task), changedFields: Object.keys(data) },
      { taskId: task.id, version: task.version, status: task.status },
    );
    return toWire(task);
  });
}
async function change(
  ownerId: string,
  input: { id: string; version: number },
  action: string,
  mutate: (
    previous: Task,
    tx: CoreTx,
  ) =>
    | Promise<Partial<typeof tasks.$inferInsert>>
    | Partial<typeof tasks.$inferInsert>,
) {
  return domainWrite(async (tx) => {
    const previous = await load(tx, ownerId, input.id);
    expectVersion(previous.version, input.version);
    const patch = await mutate(previous, tx);
    const changedFields = Object.keys(patch).filter(
      (key) =>
        JSON.stringify(previous[key as keyof Task]) !==
        JSON.stringify(patch[key as keyof typeof patch]),
    );
    if (!changedFields.length) return toWire(previous);
    const [task] = await tx
      .update(tasks)
      .set({ ...patch, version: previous.version + 1, updatedAt: new Date() })
      .where(
        and(
          eq(tasks.id, previous.id),
          eq(tasks.ownerId, ownerId),
          eq(tasks.version, input.version),
          isNull(tasks.deletedAt),
        ),
      )
      .returning();
    if (!task) conflict();
    if (changedFields.includes('projectId') || task.deletedAt)
      await syncProject(tx, task);
    if (task.deletedAt)
      await tx
        .update(entityLinks)
        .set({
          deletedAt: new Date(),
          updatedAt: new Date(),
          version: sql`${entityLinks.version}+1`,
        })
        .where(
          and(
            eq(entityLinks.ownerId, ownerId),
            isNull(entityLinks.deletedAt),
            or(
              and(
                eq(entityLinks.fromType, 'TASK'),
                eq(entityLinks.fromId, task.id),
              ),
              and(
                eq(entityLinks.toType, 'TASK'),
                eq(entityLinks.toId, task.id),
              ),
            ),
          ),
        );
    await recordChange(
      tx,
      ownerId,
      'TASK',
      task.id,
      action,
      { before: snapshot(previous), after: snapshot(task), changedFields },
      { taskId: task.id, version: task.version, status: task.status },
    );
    return toWire(task);
  });
}
function openTask(task: Task) {
  if (task.status === 'COMPLETED' || task.status === 'DROPPED')
    invalid('请先重新打开这条记录。');
}
export async function updateTask(ownerId: string, input: unknown) {
  const { id, version, ...data } = taskUpdateSchema.parse(input);
  return change(
    ownerId,
    { id, version },
    'TaskUpdated',
    async (previous, tx) => {
      openTask(previous);
      if(previous.sourceType==='ASSIGNMENT'){
        if(data.sourceType!==undefined||data.sourceId!==undefined)invalid('课程来源不能在 QUEST 中更换。');
        if(data.dueAt!==undefined&&dateOrNull(data.dueAt)?.getTime()!==previous.dueAt?.getTime())invalid('课程截止时间请在 STUDY 作业中修改。');
      }
      const patch: Partial<typeof tasks.$inferInsert> = {
        ...data,
        plannedStart:
          data.plannedStart === undefined
            ? previous.plannedStart
            : dateOrNull(data.plannedStart),
        plannedEnd:
          data.plannedEnd === undefined
            ? previous.plannedEnd
            : dateOrNull(data.plannedEnd),
        dueAt:
          data.dueAt === undefined ? previous.dueAt : dateOrNull(data.dueAt),
      };
      const next = { ...previous, ...patch };
      validRange(next.plannedStart, next.plannedEnd);
      await validateReferences(tx, ownerId, next);
      if (previous.status !== 'ACTIVE')
        patch.status = next.plannedStart || next.dueAt ? 'PLANNED' : 'INBOX';
      return patch;
    },
  );
}
export async function startTask(ownerId: string, input: unknown) {
  const data = taskActionSchema.parse(input);
  return change(ownerId, data, 'TaskStarted', (previous) => {
    openTask(previous);
    if (previous.status === 'ACTIVE') invalid('任务已在进行中。');
    return { status: 'ACTIVE' };
  });
}
// Internal, narrow undo command. It is never exposed as a generic patch endpoint.
export async function undoTaskEdit(ownerId:string,input:{id:string;version:number;before:Record<string,unknown>}) {
  const {status,...fields}=input.before;
  const {version:_oldVersion,...rest}=fields;
  const parsed=taskUpdateSchema.parse({...rest,id:input.id,version:input.version});
  if(!['INBOX','PLANNED','ACTIVE','DELAYED'].includes(String(status)))invalid('原任务状态不可撤销恢复。');
  return change(ownerId,input,'TaskEditUndone',async(previous,tx)=>{
    openTask(previous);
    if(previous.sourceType==='ASSIGNMENT'&&dateOrNull(parsed.dueAt)?.getTime()!==previous.dueAt?.getTime())invalid('作业截止已变化，请在 STUDY 中处理。');
    const {id:_id,version:_version,...patch}=parsed;
    const next={...previous,...patch,plannedStart:dateOrNull(parsed.plannedStart),plannedEnd:dateOrNull(parsed.plannedEnd),dueAt:dateOrNull(parsed.dueAt)};
    validRange(next.plannedStart,next.plannedEnd);await validateReferences(tx,ownerId,next);
    return {...patch,plannedStart:next.plannedStart,plannedEnd:next.plannedEnd,dueAt:next.dueAt,status:status as Task['status']};
  });
}
export async function completeTask(ownerId: string, input: unknown) {
  const data = taskCompleteSchema.parse(input);
  return change(ownerId, data, 'TaskCompleted', (previous) => {
    openTask(previous);
    return {
      status: 'COMPLETED',
      completedAt: new Date(),
      ...(data.actualMinutes !== undefined
        ? { actualMinutes: data.actualMinutes }
        : {}),
    };
  });
}
export async function delayTask(ownerId: string, input: unknown) {
  const data = taskDelaySchema.parse(input);
  return change(ownerId, data, 'TaskDelayed', (previous) => {
    openTask(previous);
    const plannedStart = new Date(data.plannedStart);
    const plannedEnd =
      data.plannedEnd === undefined
        ? previous.plannedStart && previous.plannedEnd
          ? new Date(
              plannedStart.getTime() +
                previous.plannedEnd.getTime() -
                previous.plannedStart.getTime(),
            )
          : null
        : dateOrNull(data.plannedEnd);
    validRange(plannedStart, plannedEnd);
    return { status: 'PLANNED', plannedStart, plannedEnd };
  });
}
export async function dropTask(ownerId: string, input: unknown) {
  const data = taskConfirmSchema.parse(input);
  return change(ownerId, data, 'TaskDropped', (previous) => {
    openTask(previous);
    return { status: 'DROPPED', completedAt: null };
  });
}
export async function reopenTask(ownerId: string, input: unknown) {
  const data = taskActionSchema.parse(input);
  return change(ownerId, data, 'TaskReopened', (previous) => {
    if (previous.status !== 'COMPLETED' && previous.status !== 'DROPPED')
      invalid('这条任务尚未结束。');
    return {
      status: previous.plannedStart || previous.dueAt ? 'PLANNED' : 'INBOX',
      completedAt: null,
    };
  });
}
export async function removeTask(ownerId: string, input: unknown) {
  const data = taskConfirmSchema.parse(input);
  return change(ownerId, data, 'TaskDeleted', () => ({
    deletedAt: new Date(),
  }));
}
export async function getTask(ownerId: string, input: unknown) {
  const { id } = taskIdSchema.parse(input);
  const [task] = await rawDb
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.ownerId, ownerId),
        eq(tasks.id, id),
        isNull(tasks.deletedAt),
      ),
    );
  if (!task) throw notFound();
  return toWire(task);
}
export async function listTasks(ownerId: string, input: unknown) {
  const data = taskListSchema.parse(input);
  return (
    await rawDb
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.ownerId, ownerId),
          isNull(tasks.deletedAt),
          data.status ? eq(tasks.status, data.status) : undefined,
        ),
      )
      .orderBy(desc(tasks.updatedAt), desc(tasks.id))
      .limit(data.limit)
      .offset(data.offset)
  ).map(toWire);
}
export async function getTaskHistory(ownerId: string, input: unknown) {
  const { id } = taskIdSchema.parse(input);
  await getTask(ownerId, { id });
  return (
    await rawDb
      .select()
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.ownerId, ownerId),
          eq(auditLogs.entityType, 'TASK'),
          eq(auditLogs.entityId, id),
        ),
      )
      .orderBy(desc(auditLogs.createdAt), desc(auditLogs.id))
      .limit(100)
  ).map(toWire);
}
export async function getTaskBoard(ownerId: string, input: unknown) {
  const data = boardInputSchema.parse(input);
  const rows = await rawDb
    .select()
    .from(tasks)
    .where(and(eq(tasks.ownerId, ownerId), isNull(tasks.deletedAt)));
  const result = buildBoard(
    rows,
    selectClockNow(process.env),
    data.timeZone,
    data.availableMinutes,
  );
  return {
    now: result.now.map((item) => ({ ...item, task: toWire(item.task) })),
    today: result.today.map(toWire),
    inbox: result.inbox.map(toWire),
  };
}
export type { TaskCreate };
