import { DbService } from '@ship/db';
import { projects } from '../projects.schema';
import { ownedResource, type CoreStore } from '../../owned-resource';
import { createSchema, updateSchema, recordSchema } from '../contract';
import { assertOwned, dateOrNull, validRange } from '../../core-methods';
const resource = ownedResource({
  kind: 'PROJECT',
  service: (connection) =>
    new DbService(projects, connection, 'projects') as unknown as CoreStore,
  createSchema,
  updateSchema,
  recordSchema,
  prepare: async (tx, ownerId, data, previous) => {
    if (data.voyageId)
      await assertOwned(tx, ownerId, 'VOYAGE', String(data.voyageId));
    const start =
      data.startAt === undefined
        ? (previous?.startAt as Date | null)
        : dateOrNull(data.startAt as string | null);
    const end =
      data.endAt === undefined
        ? (previous?.endAt as Date | null)
        : dateOrNull(data.endAt as string | null);
    if (start && end) validRange(start, end);
    return {
      ...(!previous
        ? {
            description: null,
            status: 'ACTIVE',
            voyageId: null,
            startAt: null,
            endAt: null,
          }
        : {}),
      ...data,
      ...(data.startAt !== undefined ? { startAt: start } : {}),
      ...(data.endAt !== undefined ? { endAt: end } : {}),
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
