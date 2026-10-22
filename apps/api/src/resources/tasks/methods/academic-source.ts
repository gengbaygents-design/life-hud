// Internal transaction bridge: University supplies an already authorized Assignment.
// Core owns the Task row and its audit/event. This module never imports University tables.
import { and, eq, isNull } from 'drizzle-orm';
import { tasks } from '../tasks.schema';
import { recordChange, type CoreTx } from '../../core-methods';
export async function createAssignmentTaskIn(
  tx: CoreTx,
  ownerId: string,
  assignment: {
    id: string;
    title: string;
    dueAt: Date | null;
    estimatedMinutes: number | null;
  },
) {
  const [task] = await tx
    .insert(tasks)
    .values({
      ownerId,
      title: '完成' + assignment.title,
      sourceType: 'ASSIGNMENT',
      sourceId: assignment.id,
      dueAt: assignment.dueAt,
      estimatedMinutes: assignment.estimatedMinutes,
      status: assignment.dueAt ? 'PLANNED' : 'INBOX',
    })
    .returning();
  await recordChange(
    tx,
    ownerId,
    'TASK',
    task.id,
    'TaskCreated',
    { sourceType: 'ASSIGNMENT', sourceId: assignment.id },
    { taskId: task.id, version: task.version, status: task.status },
  );
  return task;
}
export async function syncAssignmentDeadlineIn(
  tx: CoreTx,
  ownerId: string,
  assignmentId: string,
  dueAt: Date | null,
) {
  const [task] = await tx
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.ownerId, ownerId),
        eq(tasks.sourceType, 'ASSIGNMENT'),
        eq(tasks.sourceId, assignmentId),
        isNull(tasks.deletedAt),
      ),
    )
    .for('update');
  if (!task || task.dueAt?.getTime() === dueAt?.getTime()) return;
  await tx
    .update(tasks)
    .set({
      dueAt,
      version: task.version + 1,
      updatedAt: new Date(),
      ...(task.status === 'INBOX' && dueAt
        ? { status: 'PLANNED' as const }
        : {}),
    })
    .where(eq(tasks.id, task.id));
  await recordChange(
    tx,
    ownerId,
    'TASK',
    task.id,
    'TaskDeadlineSynchronized',
    {
      beforeDueAt: task.dueAt?.toISOString() ?? null,
      afterDueAt: dueAt?.toISOString() ?? null,
      sourceId: assignmentId,
    },
    { taskId: task.id, version: task.version + 1 },
  );
}
