import { createHash } from 'node:crypto';
import { and, eq, isNull, lte, asc, desc, sql } from 'drizzle-orm';
import { rawDb } from '@/db';
import { reminderRules } from './reminder-rules.schema';
import { notificationInstances } from '../notification-instances/notification-instances.schema';
import { tasks } from '../tasks/tasks.schema';
import { assignments } from '../assignments/assignments.schema';
import { exams } from '../exams/exams.schema';
import { createSchema, cancelSchema, recordSchema } from './contract';
import {
  domainWrite,
  expectVersion,
  invalid,
  notFound,
  recordChange,
  toWire,
} from '../core-methods';
import { selectClockNow } from '../core-clock';
import { quietDelivery } from './quiet';
const wire = (row: typeof reminderRules.$inferSelect) =>
  recordSchema.parse(toWire(row));
export async function createReminder(ownerId: string, input: unknown) {
  const p = createSchema.parse(input),
    at = new Date(p.scheduledAt),
    now = selectClockNow(process.env);
  if (p.priority === 'P0' && !p.confirmCritical)
    invalid('关键提醒需要明确确认。');
  const logicalKey = createHash('sha256')
    .update(
      JSON.stringify([
        p.title.normalize('NFKC'),
        at.toISOString(),
        p.sourceType ?? null,
        p.sourceId ?? null,
        p.priority,
        p.timeZone,
        p.quietStart,
        p.quietEnd,
        p.quietHoursPolicy,
      ]),
    )
    .digest('hex');
  return domainWrite(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${ownerId},73))`,
    );
    const [existing] = await tx
      .select()
      .from(reminderRules)
      .where(
        and(
          eq(reminderRules.ownerId, ownerId),
          eq(reminderRules.logicalKey, logicalKey),
        ),
      );
    if (existing) return wire(existing);
    if (at <= now) invalid('请选择未来的提醒时间。');
    if (p.sourceType && p.sourceId) {
      const table = { TASK: tasks, ASSIGNMENT: assignments, EXAM: exams }[
        p.sourceType
      ];
      const [source] = await tx
        .select({ id: table.id })
        .from(table)
        .where(
          and(
            eq(table.ownerId, ownerId),
            eq(table.id, p.sourceId),
            isNull(table.deletedAt),
          ),
        )
        .for('update');
      if (!source) throw notFound();
    }
    const { confirmCritical: _confirm, ...fields } = p;
    const [row] = await tx
      .insert(reminderRules)
      .values({
        ...fields,
        ownerId,
        scheduledAt: at,
        nextTriggerAt: at,
        logicalKey,
      })
      .returning();
    await recordChange(
      tx,
      ownerId,
      'REMINDER_RULE',
      row.id,
      'ReminderScheduled',
      {
        fields: ['scheduledAt', 'source', 'priority'],
        criticalConfirmed: p.priority === 'P0' && p.confirmCritical,
      },
      {},
      false,
    );
    return wire(row);
  });
}
export async function listReminders(ownerId: string) {
  return (
    await rawDb
      .select()
      .from(reminderRules)
      .where(
        and(
          eq(reminderRules.ownerId, ownerId),
          isNull(reminderRules.deletedAt),
        ),
      )
      .orderBy(sql`case when ${reminderRules.status}='ACTIVE' then 0 else 1 end`,sql`case when ${reminderRules.status}='ACTIVE' then ${reminderRules.nextTriggerAt} end asc nulls last`,desc(reminderRules.createdAt))
      .limit(100)
  ).map(wire);
}
export async function cancelReminder(ownerId: string, input: unknown) {
  const p = cancelSchema.parse(input);
  return domainWrite(async (tx) => {
    const [row] = await tx
      .select()
      .from(reminderRules)
      .where(
        and(
          eq(reminderRules.ownerId, ownerId),
          eq(reminderRules.id, p.id),
          isNull(reminderRules.deletedAt),
        ),
      )
      .for('update');
    if (!row) throw notFound();
    if (row.status === 'CANCELLED') return wire(row);
    expectVersion(row.version, p.version);
    if (row.status !== 'ACTIVE') invalid('已送达的提醒保留在历史中。');
    const [saved] = await tx
      .update(reminderRules)
      .set({
        status: 'CANCELLED',
        nextTriggerAt: null,
        version: row.version + 1,
        updatedAt: new Date(),
      })
      .where(eq(reminderRules.id, row.id))
      .returning();
    await recordChange(
      tx,
      ownerId,
      'REMINDER_RULE',
      row.id,
      'ReminderCancelled',
      {},
      {},
      false,
    );
    return wire(saved);
  });
}
// The database is the schedule. Repeated ticks and concurrent/restarted workers
// claim rows transactionally; one-time occurrence keys provide a second barrier.
export async function reconcileReminders(
  now = selectClockNow(process.env),
  onlyOwnerId?: string,
) {
  return rawDb.transaction(async (tx) => {
    const due = await tx
      .select()
      .from(reminderRules)
      .where(
        and(
          eq(reminderRules.status, 'ACTIVE'),
          isNull(reminderRules.deletedAt),
          lte(reminderRules.nextTriggerAt, now),
          onlyOwnerId ? eq(reminderRules.ownerId, onlyOwnerId) : undefined,
        ),
      )
      .orderBy(asc(reminderRules.nextTriggerAt))
      .limit(100)
      .for('update', { skipLocked: true });
    let generated = 0;
    for (const rule of due) {
      const delivery = quietDelivery(rule, now);
      if (delivery.next > now) {
        await tx
          .update(reminderRules)
          .set({
            nextTriggerAt: delivery.next,
            updatedAt: now,
            version: rule.version + 1,
          })
          .where(eq(reminderRules.id, rule.id));
        continue;
      }
      const [instance] = await tx
        .insert(notificationInstances)
        .values({
          ownerId: rule.ownerId,
          reminderRuleId: rule.id,
          title: rule.title,
          scheduledFor: rule.scheduledAt,
          generatedAt: now,
          deliveredAt: now,
          priority: rule.priority,
          dedupeKey: rule.id + ':' + rule.scheduledAt.toISOString(),
          silent: delivery.silent,
        })
        .onConflictDoNothing()
        .returning({ id: notificationInstances.id });
      await tx
        .update(reminderRules)
        .set({
          status: 'FIRED',
          lastTriggeredAt: now,
          nextTriggerAt: null,
          version: rule.version + 1,
          updatedAt: now,
        })
        .where(eq(reminderRules.id, rule.id));
      if (instance) {
        generated++;
        await recordChange(
          tx,
          rule.ownerId,
          'NOTIFICATION_INSTANCE',
          instance.id,
          'NotificationDelivered',
          { silent: delivery.silent },
          {},
          false,
        );
      }
    }
    return { claimed: due.length, generated };
  });
}
