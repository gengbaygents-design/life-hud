import { DbService } from '@ship/db';
import { classSessions } from '../class-sessions.schema';
import { ownedResource, type CoreStore } from '../../owned-resource';
import { createSchema, updateSchema, recordSchema } from '../contract';
import { prepareUniversity } from '../../university-methods';
const resource = ownedResource({
  publishEvents: false,
  kind: 'CLASS_SESSION',
  service: (connection) =>
    new DbService(
      classSessions,
      connection,
      'classSessions',
    ) as unknown as CoreStore,
  createSchema,
  updateSchema,
  recordSchema,
  prepare: (tx, ownerId, data, previous) =>
    prepareUniversity('CLASS_SESSION', tx, ownerId, data, previous),
});
export const {
  createRecord,
  listRecords,
  getRecord,
  updateRecord,
  removeRecord,
} = resource;
