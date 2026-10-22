import { learningRecords } from '../learning-records.schema';
import {
  linkedCreateSchema as createSchema,
  updateSchema,
  recordSchema,
} from '../contract';
import { personalResource } from '../../personal-resource';
const methods = personalResource('LEARNING_RECORD', learningRecords, {
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
