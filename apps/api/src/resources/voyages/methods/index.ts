import { and, eq, isNull } from 'drizzle-orm';
import { DbService } from '@ship/db';
import { voyages } from '../voyages.schema';
import { ownedResource, type CoreStore } from '../../owned-resource';
import { createSchema, updateSchema, recordSchema } from '../contract';
import {
  assertOwned,
  dateOrNull,
  domainWrite,
  invalid,
  notFound,
  recordChange,
  toWire,
  validRange,
  type CoreTx,
} from '../../core-methods';
export async function ensureUniversityVoyageIn(tx: CoreTx, ownerId: string) {
  const where = and(
    eq(voyages.ownerId, ownerId),
    eq(voyages.status, 'ACTIVE'),
    eq(voyages.voyageType, 'UNIVERSITY'),
    isNull(voyages.deletedAt),
  );
  const [existing] = await tx.select().from(voyages).where(where);
  if (existing) return existing;
  const [created] = await tx
    .insert(voyages)
    .values({ ownerId, title: '大学 · 第一段航行', startAt: new Date() })
    .onConflictDoNothing()
    .returning();
  if (created) {
    await recordChange(
      tx,
      ownerId,
      'VOYAGE',
      created.id,
      'VoyageStarted',
      { initial: true },
      { version: 1 },
    );
    return created;
  }
  const [concurrent] = await tx.select().from(voyages).where(where);
  if (!concurrent) throw notFound();
  return concurrent;
}
export async function ensureCurrent(ownerId: string, _input: unknown = {}) {
  return domainWrite(async (tx) =>
    toWire(await ensureUniversityVoyageIn(tx, ownerId)),
  );
}
const resource = ownedResource({
  kind: 'VOYAGE',
  service: (connection) =>
    new DbService(voyages, connection, 'voyages') as unknown as CoreStore,
  createSchema,
  updateSchema,
  recordSchema,
  prepare: async (tx, ownerId, data, previous) => {
    const start =
      data.startAt === undefined
        ? (previous?.startAt as Date)
        : dateOrNull(data.startAt as string);
    const end =
      data.endAt === undefined
        ? (previous?.endAt as Date | null)
        : dateOrNull(data.endAt as string | null);
    validRange(start, end ?? null);
    if (data.parentVoyageId) {
      await assertOwned(tx, ownerId, 'VOYAGE', String(data.parentVoyageId));
      let parent = String(data.parentVoyageId);
      for (let depth = 0; parent; depth++) {
        if (parent === previous?.id || depth >= 32)
          invalid('航程层级不能循环或超过 32 层。');
        const [row] = await tx
          .select({ parent: voyages.parentVoyageId })
          .from(voyages)
          .where(and(eq(voyages.id, parent), eq(voyages.ownerId, ownerId)));
        parent = row?.parent ?? '';
      }
    }
    return {
      ...(!previous
        ? {
            parentVoyageId: null,
            status: 'ACTIVE',
            voyageType: 'UNIVERSITY',
            primaryContext: 'UNIVERSITY',
            summary: null,
            visualSeed: null,
          }
        : {}),
      ...data,
      ...(data.startAt !== undefined ? { startAt: start } : {}),
      ...(!previous || data.endAt !== undefined ? { endAt: end ?? null } : {}),
    };
  },
});
export const {
  createRecord,
  listRecords,
  getRecord,
  updateRecord,
  removeRecord,
} = resource;
