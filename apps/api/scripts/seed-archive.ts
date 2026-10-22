import { pathToFileURL } from 'node:url';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { rawDb, databaseClient } from '../src/db';
import { users } from '../src/resources/users/users.schema';
import { captainLogs } from '../src/resources/captain-logs/captain-logs.schema';
import { archiveEntries } from '../src/resources/archive-entries/archive-entries.schema';
import { learningRecords } from '../src/resources/learning-records/learning-records.schema';
import { projects } from '../src/resources/projects/projects.schema';
import { createLog } from '../src/resources/captain-logs/methods';
import { createEntry } from '../src/resources/archive-entries/methods';
import { createRecord as createLearning } from '../src/resources/learning-records/methods';
import { createRecord as createProject } from '../src/resources/projects/methods';
import { ensureCurrent } from '../src/resources/voyages/methods';
import { seedId } from './seed-core';
import fixtures from './archive-fixtures.json';
export async function seedArchive(
  ownerId: string,
  day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(
    new Date(),
  ),
) {
  if (process.env.APP_ENV !== 'development')
    throw new Error('Development fixtures only');
  z.string().date().parse(day);
  const [owner] = await rawDb
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, ownerId));
  if (!owner) throw new Error('Existing account required');
  const voyage = await ensureCurrent(ownerId, {}),
    id = (key: string) => seedId(ownerId, 'archive-v1:' + key);
  const [oldProject] = await rawDb
    .select({ id: projects.id })
    .from(projects)
    .where(
      and(
        eq(projects.ownerId, ownerId),
        eq(projects.title, fixtures.projectTitle),
      ),
    );
  const projectId =
    oldProject?.id ??
    (
      await createProject(
        ownerId,
        { title: fixtures.projectTitle, voyageId: voyage.id },
        id('project'),
      )
    ).id;
  const [oldLearning] = await rawDb
    .select({ id: learningRecords.id })
    .from(learningRecords)
    .where(
      and(
        eq(learningRecords.ownerId, ownerId),
        eq(learningRecords.id, id('learning')),
      ),
    );
  if (!oldLearning)
    await createLearning(
      ownerId,
      {
        title: fixtures.learningTitle,
        sourceKind: 'TEXT',
        sourceRef: '对推荐系统的一个学习线索。',
      },
      id('learning'),
    );
  const [oldLog] = await rawDb
    .select({ id: captainLogs.id })
    .from(captainLogs)
    .where(
      and(eq(captainLogs.ownerId, ownerId), eq(captainLogs.id, id('log'))),
    );
  if (!oldLog)
    await createLog(
      ownerId,
      {
        body: fixtures.captainBody,
        recordedAt: day + 'T18:00:00+08:00',
        voyageId: voyage.id,
      },
      id('log'),
    );
  const [oldMarker] = await rawDb
    .select({ id: archiveEntries.id })
    .from(archiveEntries)
    .where(
      and(
        eq(archiveEntries.ownerId, ownerId),
        eq(archiveEntries.id, id('marker')),
      ),
    );
  if (!oldMarker)
    await createEntry(
      ownerId,
      {
        title: fixtures.markerTitle,
        recordedAt: day + 'T18:05:00+08:00',
        voyageId: voyage.id,
        links: [
          { sourceType: 'PROJECT', sourceId: projectId },
          { sourceType: 'LEARNING_RECORD', sourceId: id('learning') },
          { sourceType: 'CAPTAIN_LOG', sourceId: id('log') },
        ],
      },
      id('marker'),
    );
  return {
    logId: id('log'),
    learningId: id('learning'),
    markerId: id('marker'),
    projectId,
    voyageId: voyage.id,
  };
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    const i = process.argv.indexOf('--email'),
      d = process.argv.indexOf('--date');
    if (i < 0) throw new Error('Existing account required');
    const [owner] = await rawDb
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, process.argv[i + 1].toLowerCase()));
    if (!owner) throw new Error('Not found');
    await seedArchive(owner.id, d < 0 ? undefined : process.argv[d + 1]);
    console.log(
      'Archive fixtures saved; existing records and edits preserved.',
    );
  } catch {
    console.error(
      'Archive seed failed; choose an existing local account and valid date.',
    );
    process.exitCode = 1;
  } finally {
    await databaseClient.end({ timeout: 2 });
  }
}
