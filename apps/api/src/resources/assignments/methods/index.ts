import { and, eq, isNull } from 'drizzle-orm';
import { rawDb } from '@/db';
import { assignments } from '../assignments.schema';
import {
  createSchema,
  updateSchema,
  actionSchema,
  recordSchema,
} from '../contract';
import { idSchema, emptySchema, confirmSchema } from '../../core-contract';
import {
  domainWrite,
  expectVersion,
  notFound,
  recordChange,
  toWire,
  dateOrNull,
  invalid,
  type CoreTx,
} from '../../core-methods';
import { universityReference } from '../../university-methods';
import {
  createAssignmentTaskIn,
  syncAssignmentDeadlineIn,
} from '../../tasks/methods/academic-source';
async function load(tx: CoreTx, ownerId: string, id: string) {
  const [row] = await tx
    .select()
    .from(assignments)
    .where(
      and(
        eq(assignments.ownerId, ownerId),
        eq(assignments.id, id),
        isNull(assignments.deletedAt),
      ),
    )
    .for('update');
  if (!row) throw notFound();
  return row;
}
export async function createRecord(
  ownerId: string,
  input: unknown,
  trustedId?: string,
) {
  const d = createSchema.parse(input);
  return domainWrite(async (tx) => {
    await universityReference(tx, ownerId, 'course', d.courseId);
    const { createTask, estimatedMinutes, ...fields } = d;
    let [row] = await tx
      .insert(assignments)
      .values({
        ...fields,
        ownerId,
        ...(trustedId ? { id: idSchema.parse({ id: trustedId }).id } : {}),
        publishedAt: dateOrNull(d.publishedAt),
        dueAt: dateOrNull(d.dueAt),
      })
      .returning();
    if (createTask) {
      const task = await createAssignmentTaskIn(tx, ownerId, {
        ...row,
        estimatedMinutes: estimatedMinutes ?? null,
      });
      [row] = await tx
        .update(assignments)
        .set({ taskId: task.id })
        .where(eq(assignments.id, row.id))
        .returning();
    }
    await recordChange(
      tx,
      ownerId,
      'ASSIGNMENT',
      row.id,
      'AssignmentCreated',
      { dueAt: row.dueAt?.toISOString() ?? null, taskId: row.taskId },
      { assignmentId: row.id, version: row.version },
    );
    return recordSchema.parse(toWire(row));
  });
}
export async function listRecords(ownerId: string, input: unknown = {}) {
  emptySchema.parse(input);
  return (
    await rawDb
      .select()
      .from(assignments)
      .where(
        and(eq(assignments.ownerId, ownerId), isNull(assignments.deletedAt)),
      )
  ).map((r) => recordSchema.parse(toWire(r)));
}
export async function getRecord(ownerId: string, input: unknown) {
  const { id } = idSchema.parse(input);
  const [row] = await rawDb
    .select()
    .from(assignments)
    .where(
      and(
        eq(assignments.ownerId, ownerId),
        eq(assignments.id, id),
        isNull(assignments.deletedAt),
      ),
    );
  if (!row) throw notFound();
  return recordSchema.parse(toWire(row));
}
export async function updateRecord(ownerId: string, input: unknown) {
  const { id, version, ...d } = updateSchema.parse(input);
  return domainWrite(async (tx) => {
    const previous = await load(tx, ownerId, id);
    expectVersion(previous.version, version);
    if (d.courseId && d.courseId !== previous.courseId)
      invalid('作业所属课程不可直接更换。');
    await universityReference(tx, ownerId, 'course', previous.courseId);
    const { publishedAt, dueAt, ...fields } = d;
    const patch = {
      ...fields,
      ...(publishedAt !== undefined
        ? { publishedAt: dateOrNull(publishedAt) }
        : {}),
      ...(dueAt !== undefined ? { dueAt: dateOrNull(dueAt) } : {}),
      version: version + 1,
      updatedAt: new Date(),
    };
    const [row] = await tx
      .update(assignments)
      .set(patch)
      .where(eq(assignments.id, id))
      .returning();
    if (d.dueAt !== undefined)
      await syncAssignmentDeadlineIn(tx, ownerId, id, row.dueAt);
    await recordChange(
      tx,
      ownerId,
      'ASSIGNMENT',
      id,
      d.workState === 'DONE' && previous.workState !== 'DONE'
        ? 'AssignmentCompleted'
        : 'AssignmentUpdated',
      {
        changedFields: Object.keys(d),
        beforeDueAt: previous.dueAt?.toISOString() ?? null,
        afterDueAt: row.dueAt?.toISOString() ?? null,
      },
      { assignmentId: id, version: row.version },
    );
    return recordSchema.parse(toWire(row));
  });
}
async function submission(ownerId: string, input: unknown, submitted: boolean) {
  const { id, version } = actionSchema.parse(input);
  return domainWrite(async (tx) => {
    const previous = await load(tx, ownerId, id);
    expectVersion(previous.version, version);
    const [row] = await tx
      .update(assignments)
      .set({
        submissionState: submitted ? 'SUBMITTED' : 'NOT_SUBMITTED',
        submittedAt: submitted ? new Date() : null,
        version: version + 1,
        updatedAt: new Date(),
      })
      .where(eq(assignments.id, id))
      .returning();
    await recordChange(
      tx,
      ownerId,
      'ASSIGNMENT',
      id,
      submitted ? 'AssignmentSubmitted' : 'AssignmentSubmissionCorrected',
      { before: previous.submissionState, after: row.submissionState },
      { assignmentId: id, version: row.version },
    );
    return recordSchema.parse(toWire(row));
  });
}
export const markAssignmentSubmitted = (ownerId: string, input: unknown) =>
  submission(ownerId, input, true);
export const markAssignmentNotSubmitted = (ownerId: string, input: unknown) =>
  submission(ownerId, input, false);
export async function removeRecord(ownerId: string, input: unknown) {
  const { id, version } = confirmSchema.parse(input);
  return domainWrite(async (tx) => {
    const row = await load(tx, ownerId, id);
    expectVersion(row.version, version);
    const [removed] = await tx
      .update(assignments)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
        version: version + 1,
      })
      .where(eq(assignments.id, id))
      .returning();
    await recordChange(
      tx,
      ownerId,
      'ASSIGNMENT',
      id,
      'AssignmentDeleted',
      { taskRetained: row.taskId },
      { assignmentId: id },
    );
    return recordSchema.parse(toWire(removed));
  });
}
