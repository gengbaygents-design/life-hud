import { DbService } from '@ship/db';
import { courseMaterialLinks } from '../course-material-links.schema';
import { ownedResource, type CoreStore } from '../../owned-resource';
import { createSchema, updateSchema, recordSchema } from '../contract';
import { prepareUniversity } from '../../university-methods';
const resource = ownedResource({
  publishEvents: false,
  kind: 'COURSE_MATERIAL_LINK',
  service: (connection) =>
    new DbService(
      courseMaterialLinks,
      connection,
      'courseMaterialLinks',
    ) as unknown as CoreStore,
  createSchema,
  updateSchema,
  recordSchema,
  prepare: (tx, ownerId, data, previous) =>
    prepareUniversity('COURSE_MATERIAL_LINK', tx, ownerId, data, previous),
});
export const {
  createRecord,
  listRecords,
  getRecord,
  updateRecord,
  removeRecord,
} = resource;
