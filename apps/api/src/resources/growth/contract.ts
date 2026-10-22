import { z } from 'zod';
import { recordSchema as learning } from '../learning-records/contract';
import { recordSchema as mistake } from '../learning-mistakes/contract';
import { recordSchema as skill } from '../skills/contract';
import { recordSchema as evidence } from '../skill-evidence/contract';
import { recordSchema as project } from '../projects/contract';
import { recordSchema as goal } from '../goals/contract';
import { recordSchema as link } from '../entity-links/contract';
import { sourceTypeSchema } from '../personal-contract';
export const recordSchema = z.object({
  records: z.array(learning),
  mistakes: z.array(mistake),
  skills: z.array(skill),
  evidence: z.array(evidence),
  projects: z.array(project),
  goals: z.array(goal),
  links: z.array(link),
  sources: z.array(
    z.object({
      type: sourceTypeSchema,
      id: z.string().uuid(),
      label: z.string(),
    }),
  ),
});
