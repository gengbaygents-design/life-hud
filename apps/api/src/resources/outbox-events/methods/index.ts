import { and, asc, desc, eq, inArray, isNull, lte } from 'drizzle-orm';
import { rawDb, type OutboxEvent } from '@/db';
import { outboxEvents } from '../outbox-events.schema';
import { listSchema } from '../contract';
import { idSchema } from '../../core-contract';
import { domainWrite, notFound, toWire, type CoreTx } from '../../core-methods';

export async function listRecords(ownerId: string, input: unknown) {
  const data = listSchema.parse(input);
  return (
    await rawDb
      .select()
      .from(outboxEvents)
      .where(
        and(
          eq(outboxEvents.ownerId, ownerId),
          data.entityId ? eq(outboxEvents.entityId, data.entityId) : undefined,
          data.entityType
            ? eq(outboxEvents.entityType, data.entityType)
            : undefined,
        ),
      )
      .orderBy(desc(outboxEvents.createdAt), desc(outboxEvents.id))
      .limit(data.limit)
      .offset(data.offset)
  ).map(toWire);
}
export async function getRecord(ownerId: string, input: unknown) {
  const { id } = idSchema.parse(input);
  const [row] = await rawDb
    .select()
    .from(outboxEvents)
    .where(and(eq(outboxEvents.ownerId, ownerId), eq(outboxEvents.id, id)));
  if (!row) throw notFound();
  return toWire(row);
}

export type LocalEventHandler = (
  event: OutboxEvent,
  tx: CoreTx,
) => Promise<void>;
const registeredHandlers = new Map<string, LocalEventHandler>();
export function registerLocalHandler(
  eventType: string,
  handler: LocalEventHandler,
) {
  if (registeredHandlers.has(eventType))
    throw new Error('Duplicate local event handler');
  registeredHandlers.set(eventType, handler);
  return () => registeredHandlers.delete(eventType);
}
// Handlers may only make local DB changes using this transaction. External effects
// will require their own idempotency/delivery contract in a later authorized phase.
export async function dispatchPendingEvents(
  handlers: ReadonlyMap<string, LocalEventHandler> = registeredHandlers,
  batchSize = 25,
  now = new Date(),
) {
  let processed = 0,
    failed = 0;
  if (!handlers.size) return { processed, failed };
  for (let index = 0; index < Math.min(100, batchSize); index++) {
    const result = await domainWrite(async (tx) => {
      const [event] = await tx
        .select()
        .from(outboxEvents)
        .where(
          and(
            isNull(outboxEvents.processedAt),
            lte(outboxEvents.availableAt, now),
            inArray(outboxEvents.eventType, [...handlers.keys()]),
          ),
        )
        .orderBy(asc(outboxEvents.createdAt), asc(outboxEvents.id))
        .limit(1)
        .for('update', { skipLocked: true });
      if (!event) return 'empty';
      try {
        await tx.transaction(async (savepoint) => {
          await handlers.get(event.eventType)!(event, savepoint);
        });
      } catch {
        await tx
          .update(outboxEvents)
          .set({
            attempts: event.attempts + 1,
            lastError: 'HANDLER_FAILED',
            availableAt: new Date(
              now.getTime() +
                Math.min(3600000, 1000 * 2 ** Math.min(event.attempts, 12)),
            ),
          })
          .where(eq(outboxEvents.id, event.id));
        return 'failed';
      }
      await tx
        .update(outboxEvents)
        .set({
          processedAt: new Date(),
          attempts: event.attempts + 1,
          lastError: null,
        })
        .where(eq(outboxEvents.id, event.id));
      return 'processed';
    });
    if (result === 'empty') break;
    if (result === 'processed') processed++;
    else failed++;
  }
  return { processed, failed };
}
