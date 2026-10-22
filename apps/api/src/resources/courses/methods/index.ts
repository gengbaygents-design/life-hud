import { DbService } from '@ship/db';
import { courses } from '../courses.schema';
import { ownedResource, type CoreStore } from '../../owned-resource';
import { createSchema, updateSchema, recordSchema } from '../contract';
import { prepareUniversity } from '../../university-methods';
const resource = ownedResource({
  publishEvents: false,
  kind: 'COURSE',
  service: (connection) =>
    new DbService(courses, connection, 'courses') as unknown as CoreStore,
  createSchema,
  updateSchema,
  recordSchema,
  prepare: (tx, ownerId, data, previous) =>
    prepareUniversity('COURSE', tx, ownerId, data, previous),
});
export const {
  createRecord,
  listRecords,
  getRecord,
  updateRecord,
  removeRecord,
} = resource;
