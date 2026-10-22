import { and, eq, isNull, ne, desc } from 'drizzle-orm';
import { rawDb } from '@/db';
import { auditSensitiveReadIn } from '../../personal-access';
import { learningRecords } from '../../learning-records/learning-records.schema';
import { learningMistakes } from '../../learning-mistakes/learning-mistakes.schema';
import { skills } from '../../skills/skills.schema';
import { skillEvidence } from '../../skill-evidence/skill-evidence.schema';
import { projects } from '../../projects/projects.schema';
import { goals } from '../../goals/goals.schema';
import { tasks } from '../../tasks/tasks.schema';
import { courses } from '../../courses/courses.schema';
import { assignments } from '../../assignments/assignments.schema';
import { files } from '../../files/files.schema';
import { entityLinks } from '../../entity-links/entity-links.schema';
import { toWire } from '../../core-methods';
import { recordSchema } from '../contract';
export async function getGrowth(ownerId: string) {
  return rawDb.transaction(
    async (tx) => {
      const scope = (
        t:
          | typeof learningRecords
          | typeof learningMistakes
          | typeof skills
          | typeof skillEvidence,
      ) =>
        and(
          eq(t.ownerId, ownerId),
          isNull(t.deletedAt),
          ne(t.privacyLevel, 'VAULT'),
        );
      const records = await tx
        .select()
        .from(learningRecords)
        .where(scope(learningRecords))
        .orderBy(desc(learningRecords.createdAt), desc(learningRecords.id));
      const mistakes = await tx
        .select()
        .from(learningMistakes)
        .where(scope(learningMistakes));
      const ownSkills = await tx.select().from(skills).where(scope(skills));
      const evidence = await tx
        .select()
        .from(skillEvidence)
        .where(scope(skillEvidence));
      const coreScope = (
        t:
          | typeof projects
          | typeof goals
          | typeof tasks
          | typeof courses
          | typeof assignments
          | typeof files,
      ) => and(eq(t.ownerId, ownerId), isNull(t.deletedAt));
      const ownProjects = await tx
          .select()
          .from(projects)
          .where(coreScope(projects)),
        ownGoals = await tx.select().from(goals).where(coreScope(goals));
      const ownTasks = await tx
        .select({ id: tasks.id, title: tasks.title })
        .from(tasks)
        .where(coreScope(tasks));
      const ownCourses = await tx
        .select({ id: courses.id, title: courses.name })
        .from(courses)
        .where(coreScope(courses));
      const ownAssignments = await tx
        .select({ id: assignments.id, title: assignments.title })
        .from(assignments)
        .where(coreScope(assignments));
      const ownFiles = await tx
        .select({ id: files.id, title: files.name })
        .from(files)
        .where(coreScope(files));
      const sources = [
        ...records.map((r) => ({
          type: 'LEARNING_RECORD',
          id: r.id,
          label: r.title,
        })),
        ...mistakes.map((r) => ({
          type: 'LEARNING_MISTAKE',
          id: r.id,
          label: r.title,
        })),
        ...ownProjects.map((r) => ({
          type: 'PROJECT',
          id: r.id,
          label: r.title,
        })),
        ...ownGoals.map((r) => ({ type: 'GOAL', id: r.id, label: r.title })),
        ...ownTasks.map((r) => ({ type: 'TASK', id: r.id, label: r.title })),
        ...ownCourses.map((r) => ({
          type: 'COURSE',
          id: r.id,
          label: r.title,
        })),
        ...ownAssignments.map((r) => ({
          type: 'ASSIGNMENT',
          id: r.id,
          label: r.title,
        })),
        ...ownFiles.map((r) => ({ type: 'FILE', id: r.id, label: r.title })),
      ];
      const links = await tx
        .select()
        .from(entityLinks)
        .where(
          and(
            eq(entityLinks.ownerId, ownerId),
            eq(entityLinks.fromType, 'LEARNING_RECORD'),
            eq(entityLinks.relationType, 'APPLIED_TO'),
            isNull(entityLinks.deletedAt),
          ),
        );
      await auditSensitiveReadIn(
        tx,
        ownerId,
        [
          ...records.map((r) => ({
            kind: 'LEARNING_RECORD',
            id: r.id,
            privacyLevel: r.privacyLevel,
          })),
          ...mistakes.map((r) => ({
            kind: 'LEARNING_MISTAKE',
            id: r.id,
            privacyLevel: r.privacyLevel,
          })),
          ...ownSkills.map((r) => ({
            kind: 'SKILL',
            id: r.id,
            privacyLevel: r.privacyLevel,
          })),
          ...evidence.map((r) => ({
            kind: 'SKILL_EVIDENCE',
            id: r.id,
            privacyLevel: r.privacyLevel,
          })),
        ],
        'GROWTH_VIEW',
      );
      return recordSchema.parse({
        records: records.map(toWire),
        mistakes: mistakes.map(toWire),
        skills: ownSkills.map(toWire),
        evidence: evidence.map(toWire),
        projects: ownProjects.map(toWire),
        goals: ownGoals.map(toWire),
        links: links.map(toWire),
        sources,
      });
    },
    { isolationLevel: 'repeatable read' },
  );
}
