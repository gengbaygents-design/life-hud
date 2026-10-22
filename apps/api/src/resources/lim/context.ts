import {
  and,
  eq,
  isNull,
  inArray,
  desc,
  gte,
  lte,
  or,
  ilike,
  sql,
} from 'drizzle-orm';
import { rawDb } from '@/db';
import { tasks } from '../tasks/tasks.schema';
import { assignments } from '../assignments/assignments.schema';
import { courses } from '../courses/courses.schema';
import { classSessions } from '../class-sessions/class-sessions.schema';
import { voyages } from '../voyages/voyages.schema';
import { statusMoments } from '../status-moments/status-moments.schema';
import { learningRecords } from '../learning-records/learning-records.schema';
import { auditLogs } from '../audit-logs/audit-logs.schema';
import { actionExecutions, actionGroups } from './lim.schema';
import { selectClasses } from '../class-sessions/methods/timetable';
import { notFound, toWire } from '../core-methods';
import { selectClockNow } from '../core-clock';
import { detectMode, selectDomains } from './intent';
import type { ContextPack } from './types';
import type { z } from 'zod';
import type { turnInputSchema } from './contract';

// Permission predicates are in SQL BEFORE any personal content is selected.
function personalGate(
  table: typeof statusMoments | typeof learningRecords,
  explicit: boolean,
) {
  return and(
    inArray(table.privacyLevel, ['NORMAL', 'PRIVATE']),
    inArray(
      table.aiPolicy,
      explicit
        ? ['ALWAYS', 'WHEN_RELEVANT', 'EXPLICIT_ONLY']
        : ['ALWAYS', 'WHEN_RELEVANT'],
    ),
  );
}
export async function buildContext(
  ownerId: string,
  input: z.infer<typeof turnInputSchema>,
  userHistory: string[],
): Promise<ContextPack> {
  const mode = detectMode(input.content),
    now = selectClockNow(process.env);
  const current = await resolveUiSource(ownerId,input);
  const pack: ContextPack = {
    asOf: now.toISOString(),
    timeZone: input.timeZone,
    mode,
    domains: selectDomains(input.content, mode, current?.type),
    current,
    candidates: [],
    userHistory: boundedHistory(userHistory),
  };
  if (mode === 'TALK') {
    pack.current = null;
    return pack;
  }
  return retrieveContext(ownerId,input,pack,current,now);
}
export async function resolveUiSource(ownerId:string,input:z.infer<typeof turnInputSchema>){
  let current=input.sourceEntity;
  const routeCourse = /^\/app\/study\/([0-9a-f-]{36})(?:[?#]|$)/i.exec(
    input.sourceRoute,
  )?.[1];
  if (!current && routeCourse) current = { type: 'COURSE', id: routeCourse };
  if (current) {
    const table = {
      TASK: tasks,
      ASSIGNMENT: assignments,
      COURSE: courses,
      LEARNING_RECORD: learningRecords,
      STATUS_MOMENT: statusMoments,
    }[current.type];
    const [owned] = await rawDb
      .select({ id: table.id })
      .from(table)
      .where(
        and(
          eq(table.ownerId, ownerId),
          eq(table.id, current.id),
          isNull(table.deletedAt),
        ),
      )
      .limit(1);
    if (!owned) throw notFound();
  }
  return current;
}
async function retrieveContext(ownerId:string,input:z.infer<typeof turnInputSchema>,pack:ContextPack,current:z.infer<typeof turnInputSchema>['sourceEntity'],now:Date){
  let courseId = current?.type === 'COURSE' ? current.id : undefined;
  if (current?.type === 'ASSIGNMENT') {
    const [row] = await rawDb
      .select({ courseId: assignments.courseId })
      .from(assignments)
      .where(
        and(
          eq(assignments.ownerId, ownerId),
          eq(assignments.id, current.id),
          isNull(assignments.deletedAt),
        ),
      );
    courseId = row?.courseId;
  }
  const recent = await rawDb
    .select({ result: actionExecutions.executionResult })
    .from(actionExecutions)
    .innerJoin(
      actionGroups,
      eq(actionGroups.id, actionExecutions.actionGroupId),
    )
    .where(
      and(
        eq(actionGroups.ownerId, ownerId),
        eq(actionGroups.sourceConversationId, input.conversationId),
        eq(actionExecutions.status, 'SUCCESS'),
      ),
    )
    .orderBy(desc(actionExecutions.createdAt), desc(actionExecutions.position))
    .limit(4);
  const last = recent
    .map((r) => r.result)
    .find((r) => r && ['TASK', 'ASSIGNMENT'].includes(r.type));
  if (last && !current && /做完了|我交了|挪到|改到/.test(input.content))
    pack.current = { type: last.type as 'TASK' | 'ASSIGNMENT', id: last.id };
  if (pack.domains.includes('VOYAGE')) {
    const [row] = await rawDb
      .select({ id: voyages.id, title: voyages.title })
      .from(voyages)
      .where(
        and(
          eq(voyages.ownerId, ownerId),
          isNull(voyages.deletedAt),
          eq(voyages.status, 'ACTIVE'),
        ),
      )
      .limit(1);
    if (row)
      pack.candidates.push({ ...row, type: 'VOYAGE', reason: '当前航程' });
  }
  let selectedAssignments: {
    id: string;
    title: string;
    version: number;
    taskId: string | null;
    courseId: string;
    dueAt: Date | null;
    workState: string;
    submissionState: string;
  }[] = [];
  if (pack.domains.includes('STUDY')) {
    const courseRows = await rawDb
      .select({ id: courses.id, name: courses.name, version: courses.version })
      .from(courses)
      .where(
        and(
          eq(courses.ownerId, ownerId),
          isNull(courses.deletedAt),
          courseId ? eq(courses.id, courseId) : eq(courses.status, 'ACTIVE'),
        ),
      )
      .limit(courseId ? 1 : 4);
    for (const row of courseRows)
      pack.candidates.push({
        type: 'COURSE',
        id: row.id,
        title: row.name,
        version: row.version,
        reason: courseId ? '当前课程' : '活跃课程',
      });
    selectedAssignments = await rawDb
      .select({
        id: assignments.id,
        title: assignments.title,
        version: assignments.version,
        taskId: assignments.taskId,
        courseId: assignments.courseId,
        dueAt: assignments.dueAt,
        workState: assignments.workState,
        submissionState: assignments.submissionState,
      })
      .from(assignments)
      .where(
        and(
          eq(assignments.ownerId, ownerId),
          isNull(assignments.deletedAt),
          courseId ? eq(assignments.courseId, courseId) : undefined,
          or(
            eq(assignments.submissionState, 'NOT_SUBMITTED'),
            current?.type === 'ASSIGNMENT'
              ? eq(assignments.id, current.id)
              : undefined,
          ),
        ),
      )
      .orderBy(desc(assignments.updatedAt))
      .limit(8);
    for (const row of selectedAssignments)
      pack.candidates.push({
        ...toWire(row),
        type: 'ASSIGNMENT',
        reason: '相关未提交作业',
      });
    const day = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now);
    const rows = await rawDb
      .select({
        id: classSessions.id,
        courseId: classSessions.courseId,
        specificDate: classSessions.specificDate,
        startTime: classSessions.startTime,
        endTime: classSessions.endTime,
        timeZone: classSessions.timeZone,
      })
      .from(classSessions)
      .where(
        and(
          eq(classSessions.ownerId, ownerId),
          isNull(classSessions.deletedAt),
          gte(classSessions.specificDate, day),
          courseRows.length
            ? inArray(
                classSessions.courseId,
                courseRows.map((c) => c.id),
              )
            : eq(
                classSessions.courseId,
                '00000000-0000-4000-8000-000000000000',
              ),
        ),
      )
      .orderBy(classSessions.specificDate, classSessions.startTime)
      .limit(20);
    const selected = selectClasses(rows, now);
    for (const row of [selected.current, selected.next])
      if (row)
        pack.candidates.push({
          ...row,
          type: 'CLASS_SESSION',
          reason: row.id === selected.current?.id ? '当前课次' : '下一课次',
        });
  }
  if (pack.domains.includes('QUEST')) {
    const ids = selectedAssignments.flatMap((a) =>
      a.taskId ? [a.taskId] : [],
    );
    if (current?.type === 'TASK') ids.push(current.id);
    if (!courseId && last?.type === 'TASK') ids.push(last.id);
    const words =
      input.content
        .match(/[\p{Script=Han}]{2,12}|[a-z]{3,20}/gu)
        ?.slice(0, 4) ?? [];
    const rows = await rawDb
      .select({
        id: tasks.id,
        title: tasks.title,
        version: tasks.version,
        status: tasks.status,
        plannedStart: tasks.plannedStart,
        plannedEnd: tasks.plannedEnd,
        dueAt: tasks.dueAt,
        importance: tasks.importance,
        sourceType: tasks.sourceType,
        sourceId: tasks.sourceId,
        projectId: tasks.projectId,
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.ownerId, ownerId),
          isNull(tasks.deletedAt),
          courseId
            ? ids.length
              ? inArray(tasks.id, ids)
              : eq(tasks.id, '00000000-0000-4000-8000-000000000000')
            : or(
                inArray(tasks.status, [
                  'INBOX',
                  'PLANNED',
                  'ACTIVE',
                  'DELAYED',
                ]),
                ids.length ? inArray(tasks.id, ids) : undefined,
                ...words.map((w) =>
                  ilike(tasks.title, '%' + w.replace(/[%_]/g, '') + '%'),
                ),
              ),
        ),
      )
      .orderBy(
        sql`case when ${tasks.id} = ${current?.type === 'TASK' ? current.id : null} then -1 when ${tasks.status}='ACTIVE' then 0 when ${tasks.dueAt} <= ${now.toISOString()} then 1 when ${tasks.dueAt} <= ${new Date(now.getTime() + 86400000).toISOString()} then 2 when ${tasks.plannedStart} <= ${now.toISOString()} then 3 else 4 end`,
        sql`${tasks.dueAt} asc nulls last`,
        desc(tasks.updatedAt),
      )
      .limit(12);
    for (const row of rows)
      pack.candidates.push({
        ...toWire(row),
        type: 'TASK',
        reason: ids.includes(row.id) ? '当前作业/任务' : '可行动候选',
      });
  }
  if (pack.domains.includes('STATUS')) {
    const explicitIds = input.shareRefs
      .filter((r) => r.type === 'STATUS_MOMENT')
      .map((r) => r.id);
    const [row] = await rawDb
      .select({
        id: statusMoments.id,
        recordedAt: statusMoments.recordedAt,
        mood: statusMoments.mood,
        energy: statusMoments.energy,
        stress: statusMoments.stress,
        focus: statusMoments.focus,
      })
      .from(statusMoments)
      .where(
        and(
          eq(statusMoments.ownerId, ownerId),
          isNull(statusMoments.deletedAt),
          gte(statusMoments.recordedAt, new Date(now.getTime() - 86400000)),
          lte(statusMoments.recordedAt, now),
          or(
            and(personalGate(statusMoments, false)),
            explicitIds.length
              ? and(
                  inArray(statusMoments.id, explicitIds),
                  personalGate(statusMoments, true),
                )
              : undefined,
          ),
        ),
      )
      .orderBy(desc(statusMoments.recordedAt))
      .limit(1);
    if (row)
      pack.candidates.push({
        ...toWire(row),
        type: 'STATUS_MOMENT',
        reason: '最近明确允许的最小状态',
      });
  }
  if (pack.domains.includes('GROWTH')) {
    const ids = input.shareRefs
      .filter((r) => r.type === 'LEARNING_RECORD')
      .map((r) => r.id);
    const rows = await rawDb
      .select({
        id: learningRecords.id,
        title: learningRecords.title,
        version: learningRecords.version,
        sourceKind: learningRecords.sourceKind,
        sourceRef: learningRecords.sourceRef,
        reflection: learningRecords.reflection,
        applications: learningRecords.applications,
      })
      .from(learningRecords)
      .where(
        and(
          eq(learningRecords.ownerId, ownerId),
          isNull(learningRecords.deletedAt),
          ids.length
            ? and(
                inArray(learningRecords.id, ids),
                personalGate(learningRecords, true),
              )
            : personalGate(learningRecords, false),
        ),
      )
      .orderBy(desc(learningRecords.updatedAt))
      .limit(ids.length ? 5 : 2);
    for (const row of rows)
      pack.candidates.push({
        ...row,
        type: 'LEARNING_RECORD',
        reason: '相关且获授权的学习记录',
      });
    if (
      current?.type === 'LEARNING_RECORD' &&
      !rows.some((r) => r.id === current.id)
    )
      pack.current = null;
  }
  const shared = pack.candidates.filter((c) =>
    ['LEARNING_RECORD', 'STATUS_MOMENT'].includes(c.type),
  );
  if (
    last &&
    pack.candidates.some((c) => c.type === last.type && c.id === last.id)
  )
    pack.focus = { type: last.type as 'TASK' | 'ASSIGNMENT', id: last.id };
  if (
    current &&
    ['LEARNING_RECORD', 'STATUS_MOMENT'].includes(current.type) &&
    !pack.candidates.some((c) => c.type === current.type && c.id === current.id)
  )
    pack.current = null;
  for (const candidate of pack.candidates)
    for (const field of ['reflection', 'applications', 'sourceRef']) {
      const value = candidate[field];
      if (typeof value === 'string' && value.length > 1200) {
        candidate[field] = value.slice(0, 1200);
        candidate.truncated = true;
      }
    }
  if (shared.length)
    await rawDb.insert(auditLogs).values(
      shared.map((c) => ({
        ownerId,
        actorId: ownerId,
        entityType: c.type,
        entityId: c.id,
        action: 'AiContextAccessed',
        metadata: {
          scope: 'LIM',
          explicit: input.shareRefs.some((r) => r.id === c.id),
        },
      })),
    );
  // No Cycle provider exists. No file bodies, notes, histories or skill trees are retrieved.
  return pack;
}
function boundedHistory(history: string[]) {
  let remaining = 16000;
  const result: string[] = [];
  for (const text of history.slice(-8).reverse()) {
    if (!remaining) break;
    const excerpt = text.slice(0, Math.min(8000, remaining));
    result.unshift(excerpt);
    remaining -= excerpt.length;
  }
  return result;
}
