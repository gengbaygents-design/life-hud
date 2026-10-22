import {
  and,
  eq,
  isNull,
  inArray,
  gte,
  lte,
  desc,
  or,
  notInArray,
} from 'drizzle-orm';
import { type CoreTx } from '../core-methods';
import { tasks } from '../tasks/tasks.schema';
import { assignments } from '../assignments/assignments.schema';
import { classSessions } from '../class-sessions/class-sessions.schema';
import { courses } from '../courses/courses.schema';
import { semesters } from '../semesters/semesters.schema';
import { voyages } from '../voyages/voyages.schema';
import { projects } from '../projects/projects.schema';
import { statusMoments } from '../status-moments/status-moments.schema';
import { classInstant } from '../class-sessions/methods/timetable';
import { reminderRules } from '../reminder-rules/reminder-rules.schema';
import { quietDelivery } from '../reminder-rules/quiet';
import type {
  HomeContext,
  WorkCandidate,
  ClassCandidate,
  StatusSnapshot,
} from './types';
type ProviderInput = {
  tx: CoreTx;
  ownerId: string;
  now: Date;
  audience: 'HOME' | 'MODEL';
  shareStatusIds: string[];
};
const iso = (date: Date | null) => date?.toISOString() ?? null;
export async function provideQuest({ tx, ownerId }: ProviderInput) {
  const rows = await tx
    .select({
      id: tasks.id,
      version: tasks.version,
      title: tasks.title,
      status: tasks.status,
      importance: tasks.importance,
      plannedStart: tasks.plannedStart,
      plannedEnd: tasks.plannedEnd,
      dueAt: tasks.dueAt,
      estimatedMinutes: tasks.estimatedMinutes,
      projectId: tasks.projectId,
      sourceType: tasks.sourceType,
      sourceId: tasks.sourceId,
    })
    .from(tasks)
    .where(
      and(
        eq(tasks.ownerId, ownerId),
        isNull(tasks.deletedAt),
        notInArray(tasks.status, ['COMPLETED', 'DROPPED']),
      ),
    );
  return rows.map((row) => ({
    candidate: {
      type: 'TASK' as const,
      title: row.title,
      reason: '',
      sourceRef: { type: 'TASK' as const, id: row.id, version: row.version },
      state: row.status,
      suggestedAction: 'OPEN_TASK' as const,
      plannedStart: iso(row.plannedStart),
      dueAt: iso(row.dueAt),
      endsAt: iso(row.plannedEnd),
      estimatedMinutes: row.estimatedMinutes,
      courseId: null,
      projectTitle: null,
      importance: row.importance,
    },
    projectId: row.projectId,
    assignmentId: row.sourceType === 'ASSIGNMENT' ? row.sourceId : null,
  }));
}
export async function provideUniversity({ tx, ownerId, now }: ProviderInput) {
  const parentScope = and(
    eq(courses.ownerId, ownerId),
    isNull(courses.deletedAt),
    eq(courses.status, 'ACTIVE'),
    eq(semesters.ownerId, ownerId),
    isNull(semesters.deletedAt),
    eq(semesters.status, 'ACTIVE'),
    eq(voyages.ownerId, ownerId),
    isNull(voyages.deletedAt),
    eq(voyages.status, 'ACTIVE'),
    eq(voyages.voyageType, 'UNIVERSITY'),
  );
  const earliest = new Date(now.getTime() - 2 * 86400000)
      .toISOString()
      .slice(0, 10),
    latest = new Date(now.getTime() + 8 * 86400000).toISOString().slice(0, 10);
  const sessions = await tx
    .select({
      id: classSessions.id,
      version: classSessions.version,
      courseId: classSessions.courseId,
      title: courses.name,
      specificDate: classSessions.specificDate,
      startTime: classSessions.startTime,
      endTime: classSessions.endTime,
      timeZone: classSessions.timeZone,
    })
    .from(classSessions)
    .innerJoin(courses, eq(courses.id, classSessions.courseId))
    .innerJoin(semesters, eq(semesters.id, courses.semesterId))
    .innerJoin(voyages, eq(voyages.id, semesters.voyageId))
    .where(
      and(
        parentScope,
        eq(classSessions.ownerId, ownerId),
        isNull(classSessions.deletedAt),
        gte(classSessions.specificDate, earliest),
        lte(classSessions.specificDate, latest),
      ),
    );
  const classes: ClassCandidate[] = sessions.map((row) => ({
    type: 'CLASS',
    title: row.title,
    reason: '',
    sourceRef: { type: 'CLASS_SESSION', id: row.id, version: row.version },
    state: 'UPCOMING',
    suggestedAction: 'OPEN_COURSE',
    plannedStart: classInstant(row),
    endsAt: classInstant(row, true),
    dueAt: null,
    estimatedMinutes: null,
    courseId: row.courseId,
    projectTitle: null,
  }));
  const academic = await tx
    .select({
      id: assignments.id,
      version: assignments.version,
      title: assignments.title,
      dueAt: assignments.dueAt,
      workState: assignments.workState,
      submissionState: assignments.submissionState,
      taskId: assignments.taskId,
      courseId: assignments.courseId,
      taskState: tasks.status,
      taskDeletedAt: tasks.deletedAt,
      estimatedMinutes: tasks.estimatedMinutes,
    })
    .from(assignments)
    .innerJoin(courses, eq(courses.id, assignments.courseId))
    .innerJoin(semesters, eq(semesters.id, courses.semesterId))
    .innerJoin(voyages, eq(voyages.id, semesters.voyageId))
    .leftJoin(
      tasks,
      and(eq(tasks.id, assignments.taskId), eq(tasks.ownerId, ownerId)),
    )
    .where(
      and(
        parentScope,
        eq(assignments.ownerId, ownerId),
        isNull(assignments.deletedAt),
        eq(assignments.submissionState, 'NOT_SUBMITTED'),
      ),
    );
  return { classes, academic };
}
export async function provideStatus({
  tx,
  ownerId,
  now,
  audience,
  shareStatusIds,
}: ProviderInput): Promise<StatusSnapshot | null> {
  const modelGate =
    audience === 'MODEL'
      ? or(
          inArray(statusMoments.aiPolicy, ['ALWAYS', 'WHEN_RELEVANT']),
          shareStatusIds.length
            ? and(
                inArray(statusMoments.id, shareStatusIds),
                eq(statusMoments.aiPolicy, 'EXPLICIT_ONLY'),
              )
            : undefined,
        )
      : undefined;
  const [row] = await tx
    .select({
      id: statusMoments.id,
      recordedAt: statusMoments.recordedAt,
      mood: statusMoments.mood,
      customMood: statusMoments.customMood,
      energy: statusMoments.energy,
      stress: statusMoments.stress,
      focus: statusMoments.focus,
    })
    .from(statusMoments)
    .where(
      and(
        eq(statusMoments.ownerId, ownerId),
        isNull(statusMoments.deletedAt),
        inArray(statusMoments.privacyLevel, ['NORMAL', 'PRIVATE']),
        modelGate,
        gte(statusMoments.recordedAt, new Date(now.getTime() - 86400000)),
        lte(statusMoments.recordedAt, now),
      ),
    )
    .orderBy(
      desc(statusMoments.recordedAt),
      desc(statusMoments.createdAt),
      desc(statusMoments.id),
    )
    .limit(1);
  return row ? { ...row, recordedAt: row.recordedAt.toISOString() } : null;
}
export async function provideVoyage({ tx, ownerId }: ProviderInput) {
  const [voyage] = await tx
    .select({ id: voyages.id, title: voyages.title })
    .from(voyages)
    .where(
      and(
        eq(voyages.ownerId, ownerId),
        isNull(voyages.deletedAt),
        eq(voyages.status, 'ACTIVE'),
      ),
    )
    .orderBy(voyages.id)
    .limit(1);
  return voyage ?? null;
}
export async function provideProjects(
  { tx, ownerId }: ProviderInput,
  ids: string[],
  voyageId?: string,
) {
  if (!ids.length && !voyageId) return [];
  return tx
    .select({
      id: projects.id,
      title: projects.title,
      voyageId: projects.voyageId,
    })
    .from(projects)
    .where(
      and(
        eq(projects.ownerId, ownerId),
        isNull(projects.deletedAt),
        eq(projects.status, 'ACTIVE'),
        or(
          ids.length ? inArray(projects.id, ids) : undefined,
          voyageId ? eq(projects.voyageId, voyageId) : undefined,
        ),
      ),
    )
    .orderBy(projects.id);
}
export function provideSystemAlerts(): HomeContext['alerts'] {
  // No authoritative durable system-alert domain exists yet. Do not invent one.
  return [];
}
export async function provideReminder({tx,ownerId,now}:ProviderInput):Promise<HomeContext['upcomingReminder']>{
 const rows=await tx.select().from(reminderRules).where(and(eq(reminderRules.ownerId,ownerId),isNull(reminderRules.deletedAt),eq(reminderRules.status,'ACTIVE'),inArray(reminderRules.priority,['P0','P1']),gte(reminderRules.nextTriggerAt,now),lte(reminderRules.nextTriggerAt,new Date(now.getTime()+3600000)))).orderBy(reminderRules.nextTriggerAt).limit(10);
 for(const row of rows){const effective=quietDelivery(row,row.nextTriggerAt!).next;if(effective.getTime()<=now.getTime()+3600000)return {id:row.id,title:row.title,scheduledAt:effective.toISOString(),priority:row.priority as 'P0'|'P1'};}
 return null;
}
export async function collectHomeContext(
  input: ProviderInput,
): Promise<HomeContext> {
  const quest = await provideQuest(input),
    university = await provideUniversity(input),
    status = await provideStatus(input),
    voyage = await provideVoyage(input);
  const projectRows = await provideProjects(
    input,
    quest.flatMap((t) => (t.projectId ? [t.projectId] : [])),
    voyage?.id,
  );
  const academic = new Map(university.academic.map((a) => [a.id, a]));
  const work: WorkCandidate[] = quest
    .filter(
      (t) =>
        !t.assignmentId || academic.get(t.assignmentId)?.workState !== 'DONE',
    )
    .map((t) => ({
      ...t.candidate,
      courseId: t.assignmentId
        ? (academic.get(t.assignmentId)?.courseId ?? null)
        : null,
      projectTitle:
        projectRows.find((p) => p.id === t.projectId)?.title ?? null,
    }));
  for (const a of university.academic) {
    const hasOpenTask = work.some((t) => t.sourceRef.id === a.taskId),
      done =
        a.workState === 'DONE' ||
        (a.taskState === 'COMPLETED' && !a.taskDeletedAt);
    if (!hasOpenTask && a.dueAt)
      work.push({
        type: 'ASSIGNMENT',
        title: a.title,
        reason: '',
        sourceRef: { type: 'ASSIGNMENT', id: a.id, version: a.version },
        state: done ? 'NOT_SUBMITTED' : a.workState,
        suggestedAction: done ? 'SUBMIT_ASSIGNMENT' : 'OPEN_COURSE',
        plannedStart: null,
        dueAt: iso(a.dueAt),
        endsAt: null,
        estimatedMinutes: done ? null : a.estimatedMinutes,
        courseId: a.courseId,
        projectTitle: null,
        importance: 'HIGH',
      });
  }
  return {
    upcomingReminder:await provideReminder(input),
    work,
    classes: university.classes,
    status,
    voyage: voyage
      ? {
          ...voyage,
          projectTitle:
            projectRows.find((p) => p.voyageId === voyage.id)?.title ?? null,
        }
      : null,
    alerts: provideSystemAlerts(),
  };
}
