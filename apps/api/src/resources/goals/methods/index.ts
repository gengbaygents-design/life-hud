import { DbService } from '@ship/db';
import { goals } from '../goals.schema';
import { ownedResource, type CoreStore } from '../../owned-resource';
import { createSchema, updateSchema, recordSchema } from '../contract';
import { dateOrNull } from '../../core-methods';
const resource = ownedResource({
  kind: 'GOAL',
  service: (connection) =>
    new DbService(goals, connection, 'goals') as unknown as CoreStore,
  createSchema,
  updateSchema,
  recordSchema,
  prepare: async (_tx, _ownerId, data, previous) => ({
    ...(!previous
      ? { description: null, status: 'ACTIVE', horizon: null, targetDate: null }
      : {}),
    ...data,
    ...(data.targetDate !== undefined
      ? { targetDate: dateOrNull(data.targetDate as string | null) }
      : {}),
  }),
});
export const {
  createRecord,
  listRecords,
  getRecord,
  updateRecord,
  removeRecord,
} = resource;
