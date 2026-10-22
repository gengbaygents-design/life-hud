import { statusMoments } from '../status-moments.schema';
import { createSchema, updateSchema, recordSchema } from '../contract';
import { personalResource } from '../../personal-resource';
const methods = personalResource('STATUS_MOMENT', statusMoments, {
  createSchema,
  updateSchema,
  recordSchema,
});
export const {
  createRecord,
  listRecords,
  getRecord,
  updateRecord,
  removeRecord,
} = methods;
