import { cycleRecords } from '../cycle-records.schema';
import { createSchema, updateSchema, recordSchema } from '../contract';
import { personalResource } from '../../personal-resource';
const methods = personalResource('CYCLE_RECORD', cycleRecords, {
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
