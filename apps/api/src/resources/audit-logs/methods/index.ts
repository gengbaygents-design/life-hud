import { and, desc, eq } from 'drizzle-orm';
import { rawDb } from '@/db';
import { auditLogs } from '../audit-logs.schema';
import { listSchema } from '../contract';
import { idSchema } from '../../core-contract';
import { notFound, toWire } from '../../core-methods';
export async function listRecords(ownerId: string, input: unknown) {
  const data = listSchema.parse(input);
  return (
    await rawDb
      .select()
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.ownerId, ownerId),
          data.entityId ? eq(auditLogs.entityId, data.entityId) : undefined,
          data.entityType
            ? eq(auditLogs.entityType, data.entityType)
            : undefined,
        ),
      )
      .orderBy(desc(auditLogs.createdAt), desc(auditLogs.id))
      .limit(data.limit)
      .offset(data.offset)
  ).map(toWire);
}
export async function getRecord(ownerId: string, input: unknown) {
  const { id } = idSchema.parse(input);
  const [row] = await rawDb
    .select()
    .from(auditLogs)
    .where(and(eq(auditLogs.ownerId, ownerId), eq(auditLogs.id, id)));
  if (!row) throw notFound();
  return toWire(row);
}
