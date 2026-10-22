import { and, eq, isNull, desc } from 'drizzle-orm';
import { rawDb } from '@/db';
import { notificationInstances as table } from './notification-instances.schema';
import { recordSchema, stateSchema } from './contract';
import {
  domainWrite,
  expectVersion,
  notFound,
  recordChange,
  toWire,
} from '../core-methods';
import { selectClockNow } from '../core-clock';
const wire = (row: typeof table.$inferSelect) =>
  recordSchema.parse(toWire(row));
export async function listNotifications(ownerId: string) {
  return (
    await rawDb
      .select()
      .from(table)
      .where(and(eq(table.ownerId, ownerId), isNull(table.deletedAt)))
      .orderBy(desc(table.generatedAt), desc(table.id))
      .limit(100)
  ).map(wire);
}
export async function setNotificationState(ownerId: string, input: unknown) {
  const p = stateSchema.parse(input);
  return domainWrite(async (tx) => {
    const [row] = await tx
      .select()
      .from(table)
      .where(
        and(
          eq(table.ownerId, ownerId),
          eq(table.id, p.id),
          isNull(table.deletedAt),
        ),
      )
      .for('update');
    if (!row) throw notFound();
    if (
      (p.action === 'READ' && row.readAt) ||
      (p.action === 'DISMISS' && row.dismissedAt)
    )
      return wire(row);
    expectVersion(row.version, p.version);
    const now = selectClockNow(process.env);
    const [saved] = await tx
      .update(table)
      .set({
        ...(p.action === 'READ'
          ? { readAt: now, status: row.dismissedAt ? 'DISMISSED' : 'READ' }
          : { dismissedAt: now, status: 'DISMISSED' }),
        version: row.version + 1,
        updatedAt: new Date(),
      })
      .where(eq(table.id, p.id))
      .returning();
    await recordChange(
      tx,
      ownerId,
      'NOTIFICATION_INSTANCE',
      row.id,
      p.action === 'READ' ? 'NotificationRead' : 'NotificationDismissed',
      {},
      {},
      false,
    );
    return wire(saved);
  });
}
