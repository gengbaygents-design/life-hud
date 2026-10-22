import { DbService } from '@ship/db';
import { semesters } from '../semesters.schema';
import { ownedResource, type CoreStore } from '../../owned-resource';
import { createSchema, updateSchema, recordSchema } from '../contract';
import { prepareUniversity } from '../../university-methods';
const resource = ownedResource({
  publishEvents: false,
  kind: 'SEMESTER',
  service: (connection) =>
    new DbService(semesters, connection, 'semesters') as unknown as CoreStore,
  createSchema,
  updateSchema,
  recordSchema,
  prepare: (tx, ownerId, data, previous) =>
    prepareUniversity('SEMESTER', tx, ownerId, data, previous),
});
export const {
  createRecord,
  listRecords,
  getRecord,
  updateRecord,
  removeRecord,
} = resource;
