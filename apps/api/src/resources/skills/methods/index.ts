import { skills } from '../skills.schema';
import { createSchema, updateSchema, recordSchema } from '../contract';
import { personalResource } from '../../personal-resource';
const methods = personalResource('SKILL', skills, {
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
