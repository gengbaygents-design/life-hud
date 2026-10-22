import { ORPCError } from '@orpc/server';
import { AsyncLocalStorage } from 'node:async_hooks';
import { and, eq, isNull } from 'drizzle-orm';
import { rawDb } from '@/db';
import { tasks } from './tasks/tasks.schema';
import { projects } from './projects/projects.schema';
import { goals } from './goals/goals.schema';
import { voyages } from './voyages/voyages.schema';
import { courses } from './courses/courses.schema';
import { assignments } from './assignments/assignments.schema';
import { files } from './files/files.schema';
import { places } from './places/places.schema';
import { learningRecords } from './learning-records/learning-records.schema';
import { learningMistakes } from './learning-mistakes/learning-mistakes.schema';
import { skills } from './skills/skills.schema';
import { auditLogs } from './audit-logs/audit-logs.schema';
import { outboxEvents } from './outbox-events/outbox-events.schema';

export type CoreTx = Parameters<Parameters<typeof rawDb.transaction>[0]>[0];
const domainTransaction = new AsyncLocalStorage<CoreTx>();
// Used by orchestration to commit a domain mutation and its execution receipt together.
// Ordinary callers retain their existing independent transaction behavior.
export function inDomainTransaction<T>(tx: CoreTx, fn: () => Promise<T>) {
  return domainTransaction.run(tx, fn);
}
export type EntityType =
  | 'TASK'
  | 'PROJECT'
  | 'GOAL'
  | 'VOYAGE'
  | 'COURSE'
  | 'ASSIGNMENT'
  | 'FILE'
  | 'PLACE'
  | 'LEARNING_RECORD'
  | 'LEARNING_MISTAKE'
  | 'SKILL';
export const notFound = () =>
  new ORPCError('NOT_FOUND', { message: 'Record not found' });
export function conflict() {
  throw new ORPCError('CONFLICT', { message: '记录已更新，请刷新后重试。' });
}
export function invalid(message: string): never {
  throw new ORPCError('BAD_REQUEST', { message });
}
export function expectVersion(actual: number, expected: number) {
  if (actual !== expected) conflict();
}
export function validRange(start: Date | null, end: Date | null) {
  if (end && (!start || end < start)) invalid('计划结束不能早于计划开始。');
}
export const dateOrNull = (value: string | null | undefined) =>
  value ? new Date(value) : null;
export function toWire<T extends Record<string, unknown>>(
  row: T,
): {
  [K in keyof T]: T[K] extends Date
    ? string
    : T[K] extends Date | null
      ? string | null
      : T[K];
} {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [
      key,
      value instanceof Date ? value.toISOString() : value,
    ]),
  ) as ReturnType<typeof toWire<T>>;
}
export async function assertOwned(
  tx: CoreTx,
  ownerId: string,
  type: EntityType,
  id: string,
) {
  const table = {
    TASK: tasks,
    PROJECT: projects,
    GOAL: goals,
    VOYAGE: voyages,
    COURSE: courses,
    ASSIGNMENT: assignments,
    FILE: files,
    PLACE: places,
    LEARNING_RECORD: learningRecords,
    LEARNING_MISTAKE: learningMistakes,
    SKILL: skills,
  }[type];
  if (!table) throw notFound();
  const [row] = await tx
    .select({ id: table.id })
    .from(table)
    .where(
      and(
        eq(table.ownerId, ownerId),
        eq(table.id, id),
        isNull(table.deletedAt),
      ),
    )
    .for('update');
  if (!row) throw notFound();
}
export async function recordChange(
  tx: CoreTx,
  ownerId: string,
  entityType: string,
  entityId: string,
  action: string,
  metadata: Record<string, unknown>,
  payload: Record<string, unknown> = {},
  publishEvent = true,
) {
  const [audit] = await tx
    .insert(auditLogs)
    .values({
      ownerId,
      actorId: ownerId,
      entityType,
      entityId,
      action,
      metadata,
    })
    .returning({ id: auditLogs.id });
  if (publishEvent)
    await tx.insert(outboxEvents).values({
      ownerId,
      entityType,
      entityId,
      eventType: action,
      payload: { ...payload, auditId: audit.id },
    });
}
export async function domainWrite<T>(
  fn: (tx: CoreTx) => Promise<T>,
): Promise<T> {
  try {
    const current = domainTransaction.getStore();
    return current ? await fn(current) : await rawDb.transaction(fn);
  } catch (error) {
    // Do not expose constraint names or foreign keys to the transport.
    const code =
      (error as { code?: string; cause?: { code?: string } })?.cause?.code ??
      (error as { code?: string })?.code;
    if (code === '23505') conflict();
    if (code === '23503') throw notFound();
    if (code === '23514') invalid('字段组合无效，请检查输入。');
    throw error;
  }
}
