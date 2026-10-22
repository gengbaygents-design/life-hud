import { and, eq, isNull, gt, sql } from 'drizzle-orm';
import { auditLogs } from '../../audit-logs/audit-logs.schema';
import { assignments } from '../assignments.schema';
import { tasks } from '../../tasks/tasks.schema';
import { recordChange } from '../../core-methods';
import {
  registerLocalHandler,
  type LocalEventHandler,
} from '../../outbox-events/methods';
export const handleTaskCompleted: LocalEventHandler = async (event, tx) => {
  if (event.entityType !== 'TASK') return;
  // Read Task without a row lock first. Assignment-first locks match deadline edits.
  const [source] = await tx
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.ownerId, event.ownerId),
        eq(tasks.id, event.entityId),
        eq(tasks.sourceType, 'ASSIGNMENT'),
        isNull(tasks.deletedAt),
      ),
    );
  if (!source?.sourceId) return;
  const [assignment] = await tx
    .select()
    .from(assignments)
    .where(
      and(
        eq(assignments.ownerId, event.ownerId),
        eq(assignments.id, source.sourceId),
        eq(assignments.taskId, source.id),
        isNull(assignments.deletedAt),
      ),
    )
    .for('update');
  if (!assignment || assignment.workState === 'DONE') return;
  const [correction] = await tx
    .select({ id: auditLogs.id })
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.ownerId, event.ownerId),
        eq(auditLogs.entityType, 'ASSIGNMENT'),
        eq(auditLogs.entityId, assignment.id),
        gt(auditLogs.createdAt, event.createdAt),
        sql`${auditLogs.metadata}->'changedFields' @> '["workState"]'::jsonb`,
      ),
    )
    .limit(1);
  if (correction) return;
  const [current] = await tx
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.ownerId, event.ownerId),
        eq(tasks.id, source.id),
        isNull(tasks.deletedAt),
      ),
    )
    .for('update');
  // A stale completion event must not mark a reopened Task's Assignment done.
  if (!current || current.status !== 'COMPLETED') return;
  await tx
    .update(assignments)
    .set({
      workState: 'DONE',
      version: assignment.version + 1,
      updatedAt: new Date(),
    })
    .where(eq(assignments.id, assignment.id));
  await recordChange(
    tx,
    event.ownerId,
    'ASSIGNMENT',
    assignment.id,
    'AssignmentCompleted',
    {
      sourceEventId: event.id,
      taskId: source.id,
      submissionState: assignment.submissionState,
    },
    { assignmentId: assignment.id, version: assignment.version + 1 },
  );
};
registerLocalHandler('TaskCompleted', handleTaskCompleted);
