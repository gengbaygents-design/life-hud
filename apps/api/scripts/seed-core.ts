import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { and, eq } from 'drizzle-orm';
import config from '../src/config';
import { databaseClient, rawDb } from '../src/db';
import { users } from '../src/resources/users/users.schema';
import { projects } from '../src/resources/projects/projects.schema';
import { tasks } from '../src/resources/tasks/tasks.schema';
import { ensureCurrent } from '../src/resources/voyages/methods';
import { createRecord } from '../src/resources/projects/methods';
import { createTask, completeTask } from '../src/resources/tasks/methods';

export function seedId(ownerId: string, key: string) {
  const hash = createHash('sha256')
    .update('life-hud-dev-v1:' + ownerId + ':' + key)
    .digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}
export async function seedCore(ownerId: string) {
  if (config.APP_ENV !== 'development')
    throw new Error('Development fixtures require APP_ENV=development');
  const [owner] = await rawDb
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, ownerId));
  if (!owner) throw new Error('Selected local account not found');
  const voyage = await ensureCurrent(ownerId, {});
  const projectId = seedId(ownerId, 'project');
  const [existingProject] = await rawDb
    .select()
    .from(projects)
    .where(and(eq(projects.ownerId, ownerId), eq(projects.id, projectId)));
  if (!existingProject)
    await createRecord(
      ownerId,
      {
        title: 'LIFE HUD · Project #001',
        description: '明确导入的本地开发示例',
        voyageId: voyage.id,
      },
      projectId,
    );
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const value = (name: string) =>
    parts.find((part) => part.type === name)!.value;
  const day = `${value('year')}-${value('month')}-${value('day')}`;
  const at = (hour: string) =>
    new Date(`${day}T${hour}:00+08:00`).toISOString();
  const fixtures = [
    {
      key: 'math',
      title: '高数第三章作业',
      plannedStart: at('20:00'),
      dueAt: at('23:59'),
      estimatedMinutes: 35,
    },
    {
      key: 'architecture',
      title: '整理 LIFE HUD 架构',
      projectId,
      importance: 'HIGH' as const,
    },
    { key: 'reading', title: '英语阅读', estimatedMinutes: 20 },
    { key: 'parcel', title: '下午拿快递', plannedStart: at('15:00') },
    { key: 'visual', title: '整理 HOME 视觉方向', complete: true },
  ];
  let created = 0;
  for (const fixture of fixtures) {
    const id = seedId(ownerId, fixture.key);
    const [existing] = await rawDb
      .select({ id: tasks.id })
      .from(tasks)
      .where(and(eq(tasks.ownerId, ownerId), eq(tasks.id, id)));
    if (existing) continue;
    const task = await createTask(
      ownerId,
      { ...fixture, description: '明确导入的本地开发示例' },
      { trustedId: id },
    );
    created++;
    if ('complete' in fixture && fixture.complete)
      await completeTask(ownerId, { id: task.id, version: task.version });
  }
  return { created, projectId };
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    const flag = process.argv.indexOf('--email');
    const email = flag >= 0 ? process.argv[flag + 1] : undefined;
    if (!email) throw new Error('Pass --email for an existing local account');
    const [owner] = await rawDb
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email.toLowerCase()));
    if (!owner) throw new Error('Selected local account not found');
    const result = await seedCore(owner.id);
    console.log(
      'Development fixtures saved; new tasks: ' +
        result.created +
        '. Repeated runs preserve existing records.',
    );
  } catch {
    console.error(
      'Development seed failed. Select an existing local account and inspect the local database.',
    );
    process.exitCode = 1;
  } finally {
    await databaseClient.end({ timeout: 2 });
  }
}
