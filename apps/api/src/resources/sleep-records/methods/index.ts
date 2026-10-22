import { sleepRecords } from '../sleep-records.schema';
import { createSchema, updateSchema, recordSchema } from '../contract';
import { personalResource } from '../../personal-resource';
const methods = personalResource('SLEEP_RECORD', sleepRecords, {
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
