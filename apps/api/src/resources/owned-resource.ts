import { z } from 'zod';
import { rawDb } from '@/db';
import {
  domainWrite,
  expectVersion,
  conflict,
  notFound,
  toWire,
  recordChange,
  type CoreTx,
} from './core-methods';
import { idSchema, confirmSchema, emptySchema } from './core-contract';
import { and, eq, isNull, or, sql } from 'drizzle-orm';
import { entityLinks } from './entity-links/entity-links.schema';

export interface CoreRow extends Record<string, unknown> {
  id: string;
  ownerId: string;
  version: number;
  deletedAt: Date | null;
}
// Narrow adapter to Ship DbService; every filter is constructed here, never by clients.
export interface CoreStore {
  findFirst(options: {
    where: Record<string, unknown>;
  }): Promise<CoreRow | undefined>;
  find(options: { where: Record<string, unknown> }): Promise<CoreRow[]>;
  insertOne(data: Record<string, unknown>): Promise<CoreRow>;
  updateOne(
    filter: Record<string, unknown>,
    data: Record<string, unknown>,
  ): Promise<CoreRow | undefined>;
}
export function ownedResource<T extends z.ZodType>({
  kind,
  service,
  createSchema,
  updateSchema,
  recordSchema,
  prepare,
  publishEvents = true,
  createdEvent,
  afterCreate,
}: {
  kind: string;
  service: (connection: CoreTx | typeof rawDb) => CoreStore;
  createSchema: z.ZodType<Record<string, unknown>>;
  updateSchema: z.ZodType<Record<string, unknown>>;
  recordSchema: T;
  publishEvents?: boolean | 'create';
  createdEvent?: string;
  afterCreate?: (
    tx: CoreTx,
    ownerId: string,
    parsed: Record<string, unknown>,
    row: CoreRow,
  ) => Promise<void>;
  prepare?: (
    tx: CoreTx,
    ownerId: string,
    data: Record<string, unknown>,
    previous?: CoreRow,
  ) => Promise<Record<string, unknown>>;
}) {
  const output = (row: CoreRow) => recordSchema.parse(toWire(row));
  const getRow = async (ownerId: string, id: string, store: CoreStore) => {
    const row = await store.findFirst({
      where: { id, ownerId, deletedAt: null },
    });
    if (!row) throw notFound();
    return row;
  };
  return {
    async createRecord(ownerId: string, input: unknown, trustedId?: string) {
      const parsed = createSchema.parse(input);
      return domainWrite(async (tx) => {
        const data = prepare ? await prepare(tx, ownerId, parsed) : parsed;
        const row = await service(tx).insertOne({
          ...data,
          ownerId,
          ...(trustedId ? { id: idSchema.parse({ id: trustedId }).id } : {}),
        });
        if (afterCreate) await afterCreate(tx, ownerId, parsed, row);
        await recordChange(
          tx,
          ownerId,
          kind,
          row.id,
          createdEvent ?? kind[0] + kind.slice(1).toLowerCase() + 'Created',
          { changedFields: Object.keys(parsed) },
          { version: row.version },
          Boolean(publishEvents),
        );
        return output(row);
      });
    },
    async listRecords(ownerId: string, input: unknown = {}) {
      emptySchema.parse(input);
      return (
        await service(rawDb).find({ where: { ownerId, deletedAt: null } })
      ).map(output);
    },
    async getRecord(ownerId: string, input: unknown) {
      const { id } = idSchema.parse(input);
      return output(await getRow(ownerId, id, service(rawDb)));
    },
    async updateRecord(ownerId: string, input: unknown) {
      const { id, version, ...parsed } = updateSchema.parse(input);
      return domainWrite(async (tx) => {
        const store = service(tx);
        const previous = await getRow(ownerId, String(id), store);
        expectVersion(previous.version, Number(version));
        const data = prepare
          ? await prepare(tx, ownerId, parsed, previous)
          : parsed;
        const row = await store.updateOne(
          { id, ownerId, version, deletedAt: null },
          { ...data, version: Number(version) + 1, updatedAt: new Date() },
        );
        if (!row) conflict();
        await recordChange(
          tx,
          ownerId,
          kind,
          String(id),
          kind[0] + kind.slice(1).toLowerCase() + 'Updated',
          {
            changedFields: Object.keys(parsed),
            beforeVersion: version,
            afterVersion: row!.version,
          },
          { version: row!.version },
          publishEvents === true,
        );
        return output(row!);
      });
    },
    async removeRecord(ownerId: string, input: unknown) {
      const { id, version } = confirmSchema.parse(input);
      return domainWrite(async (tx) => {
        const store = service(tx);
        const previous = await getRow(ownerId, id, store);
        expectVersion(previous.version, version);
        const row = await store.updateOne(
          { id, ownerId, version, deletedAt: null },
          {
            deletedAt: new Date(),
            updatedAt: new Date(),
            version: version + 1,
          },
        );
        if (!row) conflict();
        await tx
          .update(entityLinks)
          .set({
            deletedAt: new Date(),
            updatedAt: new Date(),
            version: sql`${entityLinks.version}+1`,
          })
          .where(
            and(
              eq(entityLinks.ownerId, ownerId),
              isNull(entityLinks.deletedAt),
              or(
                and(eq(entityLinks.fromType, kind), eq(entityLinks.fromId, id)),
                and(eq(entityLinks.toType, kind), eq(entityLinks.toId, id)),
              ),
            ),
          );
        await recordChange(
          tx,
          ownerId,
          kind,
          id,
          kind[0] + kind.slice(1).toLowerCase() + 'Deleted',
          { beforeVersion: version, afterVersion: version + 1 },
          { version: version + 1 },
          publishEvents === true,
        );
        return output(row!);
      });
    },
  };
}
