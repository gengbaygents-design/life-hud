import { and, eq, isNull } from 'drizzle-orm';
import { captainLogs as table } from './captain-logs.schema';
import { createSchema, updateSchema, recordSchema } from './contract';
import { confirmSchema, idSchema } from '../core-contract';
import {
  assertOwned,
  domainWrite,
  expectVersion,
  notFound,
  recordChange,
  toWire,
} from '../core-methods';
import { selectClockNow } from '../core-clock';
import { auditSensitiveReadIn } from '../personal-access';
const wire = (r: typeof table.$inferSelect) => recordSchema.parse(toWire(r));
export async function createLog(
  ownerId: string,
  input: unknown,
  trustedId?: string,
) {
  const p = createSchema.parse(input);
  return domainWrite(async (tx) => {
    if (p.voyageId) await assertOwned(tx, ownerId, 'VOYAGE', p.voyageId);
    const [row] = await tx
      .insert(table)
      .values({
        ...p,
        ...(trustedId ? { id: idSchema.parse({ id: trustedId }).id } : {}),
        ownerId,
        recordedAt: p.recordedAt
          ? new Date(p.recordedAt)
          : selectClockNow(process.env),
      })
      .returning();
    await recordChange(
      tx,
      ownerId,
      'CAPTAIN_LOG',
      row.id,
      'CaptainLogCreated',
      { fields: ['body', 'privacy'] },
      {},
      false,
    );
    return wire(row);
  });
}
export async function getLog(ownerId: string, input: unknown) {
  const { id } = idSchema.strict().parse(input);
  return domainWrite(async (tx) => {
    const [row] = await tx
      .select()
      .from(table)
      .where(
        and(
          eq(table.ownerId, ownerId),
          eq(table.id, id),
          isNull(table.deletedAt),
        ),
      );
    if (!row) throw notFound();
    await auditSensitiveReadIn(
      tx,
      ownerId,
      [{ kind: 'CAPTAIN_LOG', id: row.id, privacyLevel: row.privacyLevel }],
      'captain-log-detail',
    );
    return wire(row);
  });
}
export async function updateLog(ownerId: string, input: unknown) {
  const p = updateSchema.parse(input);
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
    expectVersion(row.version, p.version);
    if (p.voyageId) await assertOwned(tx, ownerId, 'VOYAGE', p.voyageId);
    const { id, version, recordedAt, ...patch } = p;
    const [saved] = await tx
      .update(table)
      .set({
        ...patch,
        ...(recordedAt ? { recordedAt: new Date(recordedAt) } : {}),
        updatedAt: new Date(),
        version: version + 1,
      })
      .where(eq(table.id, id))
      .returning();
    await recordChange(
      tx,
      ownerId,
      'CAPTAIN_LOG',
      id,
      'CaptainLogUpdated',
      { fields: Object.keys(patch) },
      {},
      false,
    );
    return wire(saved);
  });
}
export async function removeLog(ownerId: string, input: unknown) {
  const p = confirmSchema.strict().parse(input);
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
    expectVersion(row.version, p.version);
    // Standard removal is soft. No audit payload/body copies impede later privacy erasure.
    await tx
      .update(table)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
        version: row.version + 1,
      })
      .where(eq(table.id, row.id));
    await recordChange(
      tx,
      ownerId,
      'CAPTAIN_LOG',
      row.id,
      'CaptainLogRemoved',
      {},
      {},
      false,
    );
    return { id: row.id };
  });
}
