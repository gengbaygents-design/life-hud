import { and, eq, isNull, sql } from 'drizzle-orm';
import { rawDb } from '@/db';
import { tasks } from '../tasks/tasks.schema';
import { assignments } from '../assignments/assignments.schema';
import * as taskMethods from '../tasks/methods';
import * as academic from '../assignments/methods';
import {
  createRecord as recordStatus,
  removeRecord as removeStatus,
} from '../status-moments/methods';
import {
  createRecord as createLearning,
  removeRecord as removeLearning,
} from '../learning-records/methods';
import { actionExecutions, actionGroups } from './lim.schema';
import {
  inDomainTransaction,
  invalid,
  notFound,
  expectVersion,
  toWire,
  recordChange,
} from '../core-methods';
import { parseAction, actionRisk, type Action } from './actions';
import { requestedRecord } from './intent';
import type { ContextPack } from './types';
import { randomUUID } from 'node:crypto';
import { createReminder } from '../reminder-rules/methods';
import { createLog } from '../captain-logs/methods';
import { createEntry } from '../archive-entries/methods';
import { canCreateLog } from '../captain-logs/author';

export function validateAuthority(
  action: Action,
  pack: ContextPack,
  text: string,
) {
  if (actionRisk(action.type) !== 'R0' && pack.mode !== 'EXECUTE')
    invalid('这句话没有请求更改记录。');
  if (action.confidence !== 'HIGH') invalid('还需要确认你指的内容。');
  if(action.type==='CREATE_REMINDER'){
    if(!/提醒|remind/i.test(text)||/(?:不要|别|不用|无需|不必|不想让你)(?:再)?提醒/.test(text)||!text.includes(String(action.payload.title)))invalid('提醒内容需要来自你的明确请求。');
    if(action.payload.sourceId&&!pack.candidates.some(c=>c.id===action.payload.sourceId&&c.type===action.payload.sourceType))throw notFound();
  }
  if(action.type==='CREATE_CAPTAIN_LOG'){
    const body=String(action.payload.body);
    if(!canCreateLog(body,pack.userHistory,text))invalid('日志只能在明确请求后保存你提供的完整原文。');
  }
  if(action.type==='REMEMBER_MOMENT'){
    if(!/记住这一刻|把这一刻记下来|remember.*moment/i.test(text))invalid('需要明确记住这一刻的请求。');
    if(action.payload.summary&&!pack.userHistory.some(s=>s.includes(String(action.payload.summary))))invalid('时刻备注只能使用你的原话。');
  }
  if (
    (action.type === 'RECORD_STATUS' && !pack.domains.includes('STATUS')) ||
    (action.type === 'CREATE_LEARNING_RECORD' &&
      !pack.domains.includes('GROWTH'))
  )
    invalid('这句话没有授权该领域的记录。');
  if (
    action.type === 'MARK_ASSIGNMENT_SUBMITTED' &&
    !/我交了|提交了|交过了|标记.*提交/.test(text)
  )
    invalid('尚未明确提交。');
  if (
    action.type === 'MARK_ASSIGNMENT_SUBMITTED' &&
    /^我交了[。.!！]?$/u.test(text) &&
    !['TASK', 'ASSIGNMENT'].includes(pack.current?.type ?? '') &&
    !pack.focus &&
    pack.candidates.filter((c) => c.type === 'ASSIGNMENT').length !== 1
  )
    invalid('提交对象尚不明确。');
  if (action.type === 'RECORD_STATUS' && !requestedRecord(text))
    invalid('记录状态需要你的明确请求。');
  if (action.type === 'CREATE_LEARNING_RECORD') {
    if (!requestedRecord(text)) invalid('记录想法需要你的明确请求。');
    for (const key of ['reflection', 'applications']) {
      const value = action.payload[key];
      if (
        value != null &&
        (typeof value !== 'string' ||
          !pack.userHistory.some((s) => s.includes(value)))
      )
        invalid('反思和应用只能使用你的原话。');
    }
    if (
      action.payload.sourceKind === 'TEXT' &&
      action.payload.sourceRef &&
      !pack.userHistory.some((s) =>
        s.includes(String(action.payload.sourceRef)),
      )
    )
      invalid('没有找到要记录的原话。');
  }
  if (
    action.type === 'RECORD_STATUS' &&
    action.payload.note &&
    !text.includes(String(action.payload.note))
  )
    invalid('状态备注只能使用你的原话。');
  if (action.type === 'RECORD_STATUS')
    for (const [key, label] of [
      ['energy', '精力'],
      ['stress', '压力'],
      ['focus', '专注'],
    ]) {
      const explicit = new RegExp(label + '[^0-9]{0,8}([0-9]+)').exec(text);
      if (
        action.payload[key] !== undefined &&
        action.payload[key] !== null &&
        (!explicit || action.payload[key] !== Number(explicit[1]))
      )
        invalid('状态数值必须与你的输入一致。');
    }
  if (action.type === 'RECORD_STATUS' && action.payload.mood) {
    const moodWords: Record<string, RegExp> = {
      HAPPY: /开心|快乐|高兴/,
      CALM: /平静|安静|放松/,
      TIRED: /累|疲惫|疲劳/,
      ANXIOUS: /焦虑|紧张|不安/,
      SAD: /难过|伤心|低落/,
    };
    if (
      action.payload.mood === 'OTHER'
        ? typeof action.payload.customMood !== 'string' ||
          !text.includes(action.payload.customMood)
        : !moodWords[String(action.payload.mood)]?.test(text)
    )
      invalid('心情必须来自你的明确表达。');
  }
}
export function safeFailure(error: unknown) {
  const code = (error as { code?: string })?.code;
  return code === 'CONFLICT'
    ? '记录已更新，请刷新后重试。'
    : code === 'NOT_FOUND'
      ? '未找到可用记录。'
      : code === 'BAD_REQUEST'
        ? '内容未通过验证，请检查输入。'
        : '操作未完成，请稍后重试。';
}
const taskState = (row: typeof tasks.$inferSelect) =>
  toWire({
    title: row.title,
    description: row.description,
    importance: row.importance,
    plannedStart: row.plannedStart,
    plannedEnd: row.plannedEnd,
    dueAt: row.dueAt,
    estimatedMinutes: row.estimatedMinutes,
    projectId: row.projectId,
    status: row.status,
    version: row.version,
  });

export async function executeAction(
  ownerId: string,
  groupId: string,
  executionId: string,
  proposal: unknown,
  pack: ContextPack,
  text: string,
  previousTask?: { id: string; version: number },
  archiveSource?: ContextPack['current'],
) {
  // Every action has one transaction containing domain write, audit/outbox, and receipt.
  return rawDb.transaction(async (tx) =>
    inDomainTransaction(tx, async () => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${ownerId}, 52))`,
      );
      const [group] = await tx
        .select({ status: actionGroups.status })
        .from(actionGroups)
        .where(
          and(eq(actionGroups.id, groupId), eq(actionGroups.ownerId, ownerId)),
        )
        .for('update');
      if (!group || group.status !== 'PROCESSING') invalid('这组行动已结束。');
      const [execution] = await tx
        .select()
        .from(actionExecutions)
        .where(
          and(
            eq(actionExecutions.id, executionId),
            eq(actionExecutions.actionGroupId, groupId),
          ),
        )
        .for('update');
      if (!execution) throw notFound();
      if (execution.status !== 'PENDING') return execution;
      const action = parseAction(proposal);
      validateAuthority(action, pack, text);
      const p = action.payload;
      let before: Record<string, unknown> | null = null;
      let row: { id: string; version: number; taskId?: string | null };
      let type = 'TASK',
        created = false;
      const versionFor = (kind: string, id: string) => {
        const candidate = pack.candidates.find(
          (c) => c.type === kind && c.id === id,
        );
        if (!candidate?.version) throw notFound();
        if (p.expectedVersion !== undefined)
          expectVersion(candidate.version, Number(p.expectedVersion));
        return candidate.version;
      };
      const taskId = () => {
        if (p.taskId === '$previousTask') {
          if (!previousTask) invalid('前一条作业未能提供任务。');
          return previousTask.id;
        }
        return String(p.taskId);
      };
      const taskVersion = async (id: string) => {
        const [existing] = await tx
          .select()
          .from(tasks)
          .where(
            and(
              eq(tasks.ownerId, ownerId),
              eq(tasks.id, id),
              isNull(tasks.deletedAt),
            ),
          )
          .for('update');
        if (!existing) throw notFound();
        before = taskState(existing);
        const version =
          p.taskId === '$previousTask'
            ? previousTask!.version
            : versionFor('TASK', id);
        expectVersion(existing.version, version);
        return version;
      };
      if (actionRisk(action.type) === 'R0') {
        await tx
          .update(actionExecutions)
          .set({
            status: 'SUCCESS',
            validationResult: 'VALID',
            completedAt: new Date(),
          })
          .where(eq(actionExecutions.id, executionId));
        return {
          ...execution,
          status: 'SUCCESS' as const,
          executionResult: null,
        };
      }
      switch (action.type) {
        case 'CREATE_REMINDER':
          type='REMINDER_RULE';row=await createReminder(ownerId,{...p,timeZone:pack.timeZone});created=true;break;
        case 'CREATE_CAPTAIN_LOG':
          type='CAPTAIN_LOG';row=await createLog(ownerId,p);created=true;break;
        case 'REMEMBER_MOMENT':
          type='ARCHIVE_ENTRY';row=await createEntry(ownerId,{...p,links:archiveSource?[{sourceType:archiveSource.type,sourceId:archiveSource.id}]:[]});created=true;break;
        case 'CREATE_TASK': {
          const matches = await tx
            .select()
            .from(tasks)
            .where(
              and(
                eq(tasks.ownerId, ownerId),
                eq(tasks.title, String(p.title)),
                isNull(tasks.deletedAt),
              ),
            )
            .for('update');
          if (matches.length > 1) invalid('有多条同名任务，请指出其中一条。');
          if (matches.length) {
            const found = matches[0];
            before = taskState(found);
            row = Object.keys(p).some((k) => k !== 'title')
              ? await taskMethods.updateTask(ownerId, {
                  ...p,
                  id: found.id,
                  version: versionFor('TASK', found.id),
                })
              : toWire(found);
          } else {
            row = await taskMethods.createTask(ownerId, p);
            created = true;
          }
          break;
        }
        case 'UPDATE_TASK': {
          const id = taskId(),
            version = await taskVersion(id),
            { taskId: _id, expectedVersion: _version, ...fields } = p;
          row = await taskMethods.updateTask(ownerId, {
            ...fields,
            id,
            version,
          });
          break;
        }
        case 'DELAY_TASK': {
          const id = taskId(),
            version = await taskVersion(id);
          row = await taskMethods.delayTask(ownerId, {
            id,
            version,
            plannedStart: p.newPlannedStart,
          });
          break;
        }
        case 'COMPLETE_TASK': {
          const id = taskId(),
            version = await taskVersion(id);
          row = await taskMethods.completeTask(ownerId, { id, version });
          before = null;
          break;
        }
        case 'CREATE_ASSIGNMENT': {
          type = 'ASSIGNMENT';
          if (
            !pack.candidates.some(
              (c) => c.type === 'COURSE' && c.id === p.courseId,
            )
          )
            throw notFound();
          const matches = await tx
            .select()
            .from(assignments)
            .where(
              and(
                eq(assignments.ownerId, ownerId),
                eq(assignments.courseId, String(p.courseId)),
                eq(assignments.title, String(p.title)),
                isNull(assignments.deletedAt),
              ),
            )
            .for('update');
          if (matches.length > 1) invalid('有多份同名作业，请指出其中一份。');
          row = matches.length
            ? await academic.updateRecord(ownerId, {
                id: matches[0].id,
                version: versionFor('ASSIGNMENT', matches[0].id),
                ...(p.dueAt !== undefined ? { dueAt: p.dueAt } : {}),
              })
            : await academic.createRecord(ownerId, p);
          created = !matches.length;
          break;
        }
        case 'UPDATE_ASSIGNMENT_DUE_DATE':
        case 'MARK_ASSIGNMENT_DONE':
        case 'MARK_ASSIGNMENT_SUBMITTED': {
          type = 'ASSIGNMENT';
          const id = String(p.assignmentId),
            version = versionFor(type, id);
          row =
            action.type === 'MARK_ASSIGNMENT_SUBMITTED'
              ? await academic.markAssignmentSubmitted(ownerId, { id, version })
              : await academic.updateRecord(ownerId, {
                  id,
                  version,
                  ...(action.type === 'MARK_ASSIGNMENT_DONE'
                    ? { workState: 'DONE' }
                    : { dueAt: p.newDueAt }),
                });
          break;
        }
        case 'RECORD_STATUS':
          type = 'STATUS_MOMENT';
          row = await recordStatus(ownerId, p);
          created = true;
          break;
        case 'CREATE_LEARNING_RECORD':
          type = 'LEARNING_RECORD';
          row = await createLearning(ownerId, p);
          created = true;
          break;
        default:
          invalid('不支持的行动。');
      }
      const reversible =
        (type === 'TASK' &&
          ['CREATE_TASK', 'UPDATE_TASK', 'DELAY_TASK'].includes(action.type)) ||
        (created &&
          ['RECORD_STATUS', 'CREATE_LEARNING_RECORD'].includes(action.type));
      const result = {
        type,
        id: row.id,
        version: row.version,
        taskId: row.taskId,
        created,
        taskVersion: undefined as number | undefined,
      };
      if (action.type === 'CREATE_ASSIGNMENT' && row.taskId) {
        const [linked] = await tx
          .select({ version: tasks.version })
          .from(tasks)
          .where(
            and(
              eq(tasks.id, row.taskId),
              eq(tasks.ownerId, ownerId),
              isNull(tasks.deletedAt),
            ),
          )
          .for('update');
        result.taskVersion = linked?.version;
      }
      const [saved] = await tx
        .update(actionExecutions)
        .set({
          status: 'SUCCESS',
          validationResult: 'VALID',
          executionResult: result,
          reversible,
          beforeState: reversible ? before : null,
          afterState: reversible ? { id: row.id, version: row.version } : null,
          completedAt: new Date(),
        })
        .where(eq(actionExecutions.id, executionId))
        .returning();
      await recordChange(
        tx,
        ownerId,
        'ACTION_EXECUTION',
        executionId,
        'LimActionExecuted',
        {
          groupId,
          actionType: action.type,
          targetType: type,
          targetId: row.id,
        },
        {},
        false,
      );
      return saved;
    }),
  );
}

export async function undoGroup(
  ownerId: string,
  groupId: string,
  token: string,
) {
  return rawDb.transaction(async (tx) =>
    inDomainTransaction(tx, async () => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${ownerId}, 52))`,
      );
      const [group] = await tx
        .select()
        .from(actionGroups)
        .where(
          and(eq(actionGroups.id, groupId), eq(actionGroups.ownerId, ownerId)),
        )
        .for('update');
      if (!group || group.undoToken !== token) throw notFound();
      if (
        !group.completedAt ||
        Date.now() - group.completedAt.getTime() > 86400000
      )
        invalid('撤销已过期，请在原页面修改。');
      const actions = await tx
        .select()
        .from(actionExecutions)
        .where(eq(actionExecutions.actionGroupId, group.id))
        .orderBy(actionExecutions.position)
        .for('update');
      for (const action of actions.reverse()) {
        if (
          action.status !== 'SUCCESS' ||
          !action.reversible ||
          !action.executionResult
        )
          continue;
        const r = action.executionResult,
          id = r.id,
          version = r.version;
        if (r.type === 'TASK') {
          if (action.beforeState)
            await taskMethods.undoTaskEdit(ownerId, {
              id,
              version,
              before: action.beforeState,
            });
          else
            await taskMethods.removeTask(ownerId, {
              id,
              version,
              confirm: true,
            });
        } else if (r.type === 'STATUS_MOMENT')
          await removeStatus(ownerId, { id, version, confirm: true });
        else if (r.type === 'LEARNING_RECORD')
          await removeLearning(ownerId, { id, version, confirm: true });
        await tx
          .update(actionExecutions)
          .set({ status: 'UNDONE' })
          .where(eq(actionExecutions.id, action.id));
        await recordChange(
          tx,
          ownerId,
          'ACTION_EXECUTION',
          action.id,
          'LimActionUndone',
          { groupId },
          {},
          false,
        );
      }
      await tx
        .update(actionGroups)
        .set({
          undoToken: null,
          result: group.result ? { ...group.result, undoToken: null } : null,
        })
        .where(eq(actionGroups.id, group.id));
      return { reply: '已撤销可撤销的操作。' };
    }),
  );
}
export const newUndoToken = () => randomUUID();
