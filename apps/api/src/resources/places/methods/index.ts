import { DbService } from '@ship/db';
import { places } from '../places.schema';
import { ownedResource, type CoreStore } from '../../owned-resource';
import { createSchema, updateSchema, recordSchema } from '../contract';
import { prepareUniversity } from '../../university-methods';
const resource = ownedResource({
  publishEvents: false,
  kind: 'PLACE',
  service: (connection) =>
    new DbService(places, connection, 'places') as unknown as CoreStore,
  createSchema,
  updateSchema,
  recordSchema,
  prepare: (tx, ownerId, data, previous) =>
    prepareUniversity('PLACE', tx, ownerId, data, previous),
});
export const {
  createRecord,
  listRecords,
  getRecord,
  updateRecord,
  removeRecord,
} = resource;
