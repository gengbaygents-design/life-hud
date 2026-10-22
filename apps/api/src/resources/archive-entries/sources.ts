import { sql } from 'drizzle-orm';
import { type CoreTx, notFound, invalid } from '../core-methods';
import { tasks } from '../tasks/tasks.schema';
import { assignments } from '../assignments/assignments.schema';
import { exams } from '../exams/exams.schema';
import { projects } from '../projects/projects.schema';
import { voyages } from '../voyages/voyages.schema';
import { courses } from '../courses/courses.schema';
import { statusMoments } from '../status-moments/status-moments.schema';
import { learningRecords } from '../learning-records/learning-records.schema';
import { classSessions } from '../class-sessions/class-sessions.schema';
import { captainLogs } from '../captain-logs/captain-logs.schema';
import { auditSensitiveReadIn } from '../personal-access';
export const sourceDefinitions = {
  TASK: { table: tasks, title: sql`${tasks.title}`, privacy: sql`'PRIVATE'` },
  ASSIGNMENT: {
    table: assignments,
    title: sql`${assignments.title}`,
    privacy: sql`'PRIVATE'`,
  },
  EXAM: { table: exams, title: sql`${exams.title}`, privacy: sql`'PRIVATE'` },
  PROJECT: {
    table: projects,
    title: sql`${projects.title}`,
    privacy: sql`'PRIVATE'`,
  },
  VOYAGE: {
    table: voyages,
    title: sql`${voyages.title}`,
    privacy: sql`'PRIVATE'`,
  },
  COURSE: {
    table: courses,
    title: sql`${courses.name}`,
    privacy: sql`'PRIVATE'`,
  },
  STATUS_MOMENT: {
    table: statusMoments,
    title: sql`'状态记录'`,
    privacy: sql`${statusMoments.privacyLevel}`,
  },
  LEARNING_RECORD: {
    table: learningRecords,
    title: sql`${learningRecords.title}`,
    privacy: sql`${learningRecords.privacyLevel}`,
  },
  CLASS_SESSION: {
    table: classSessions,
    title: sql`'课程时段'`,
    privacy: sql`'PRIVATE'`,
  },
  CAPTAIN_LOG: {
    table: captainLogs,
    title: sql`'Captain’s Log'`,
    privacy: sql`${captainLogs.privacyLevel}`,
  },
};
export type ArchiveSource = keyof typeof sourceDefinitions;
export const privacyRank: Record<string, number> = {
  NORMAL: 0,
  PRIVATE: 1,
  HIGH_PRIVATE: 2,
  VAULT: 3,
};
export async function sourceReference(
  tx: CoreTx,
  ownerId: string,
  type: ArchiveSource,
  id: string,
  includeSensitive = false,
  creating = false,
) {
  const d = sourceDefinitions[type];
  if (!d) invalid('不支持的引用类型。');
  const [row] = await tx.execute<{
    id: string;
    title: string;
    privacy: string;
    deletedAt: Date | null;
  }>(
    sql`select ${d.table.id} as id, ${d.title} as title, ${d.privacy} as privacy, ${d.table.deletedAt} as "deletedAt" from ${d.table} where ${d.table.ownerId}=${ownerId} and ${d.table.id}=${id}`,
  );
  if (creating && (!row || row.deletedAt)) throw notFound();
  if (
    !row ||
    row.deletedAt ||
    (!includeSensitive && privacyRank[row.privacy] > 1)
  )
    return {
      sourceType: type,
      sourceId: id,
      title: '原记录已移除或不可用',
      available: false,
      privacyLevel: null,
    };
  if (!creating)
    await auditSensitiveReadIn(
      tx,
      ownerId,
      [{ kind: type, id, privacyLevel: row.privacy }],
      'archive-reference',
    );
  return {
    sourceType: type,
    sourceId: id,
    title: row.title,
    available: true,
    privacyLevel: row.privacy,
  };
}
