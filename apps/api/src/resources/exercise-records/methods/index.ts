import { exerciseRecords } from '../exercise-records.schema';
import { createSchema, updateSchema, recordSchema } from '../contract';
import { personalResource } from '../../personal-resource';
const methods = personalResource('EXERCISE_RECORD', exerciseRecords, {
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
