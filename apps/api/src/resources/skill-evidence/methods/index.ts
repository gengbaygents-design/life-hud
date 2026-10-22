import { skillEvidence } from '../skill-evidence.schema';
import {
  confirmedCreateSchema as createSchema,
  updateSchema,
  recordSchema,
} from '../contract';
import { personalResource } from '../../personal-resource';
const methods = personalResource('SKILL_EVIDENCE', skillEvidence, {
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
