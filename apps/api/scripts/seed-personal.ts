import { pathToFileURL } from 'node:url';
import { and, eq, or, isNull } from 'drizzle-orm';
import { rawDb, databaseClient } from '../src/db';
import { users } from '../src/resources/users/users.schema';
import { projects } from '../src/resources/projects/projects.schema';
import { statusMoments } from '../src/resources/status-moments/status-moments.schema';
import { sleepRecords } from '../src/resources/sleep-records/sleep-records.schema';
import { waterRecords } from '../src/resources/water-records/water-records.schema';
import { cycleRecords } from '../src/resources/cycle-records/cycle-records.schema';
import { learningRecords } from '../src/resources/learning-records/learning-records.schema';
import { learningMistakes } from '../src/resources/learning-mistakes/learning-mistakes.schema';
import { skills } from '../src/resources/skills/skills.schema';
import { skillEvidence } from '../src/resources/skill-evidence/skill-evidence.schema';
import * as projectMethods from '../src/resources/projects/methods';
import * as statusMethods from '../src/resources/status-moments/methods';
import * as sleepMethods from '../src/resources/sleep-records/methods';
import * as waterMethods from '../src/resources/water-records/methods';
import * as cycleMethods from '../src/resources/cycle-records/methods';
import * as learningMethods from '../src/resources/learning-records/methods';
import * as mistakeMethods from '../src/resources/learning-mistakes/methods';
import * as skillMethods from '../src/resources/skills/methods';
import * as evidenceMethods from '../src/resources/skill-evidence/methods';
import { seedId } from './seed-core';
import { seedUniversity } from './seed-university';
import { selectClockNow } from '../src/resources/core-clock';
import fixtures from './personal-fixtures.json';
export async function seedPersonal(
  ownerId: string,
  day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(
    selectClockNow(process.env),
  ),
  includePrivateCycle = false,
) {
  if (process.env.APP_ENV !== 'development' || !/^\d{4}-\d{2}-\d{2}$/.test(day))
    throw new Error('Explicit development fixtures only');
  const [owner] = await rawDb
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, ownerId));
  if (!owner) throw new Error('Select existing local account');
  const university = await seedUniversity(ownerId, day);
  const id = (key: string) => seedId(ownerId, 'personal-v1:' + key),
    at = (time: string) => day + 'T' + time + ':00+08:00';
  const ensure = async (
    table:
      | typeof statusMoments
      | typeof sleepRecords
      | typeof waterRecords
      | typeof cycleRecords
      | typeof learningRecords
      | typeof learningMistakes
      | typeof skills
      | typeof skillEvidence
      | typeof projects,
    key: string,
    create: (ownerId: string, input: unknown, id?: string) => Promise<unknown>,
    input: unknown,
  ) => {
    const recordId = id(key);
    const [old] = await rawDb
      .select({ id: table.id })
      .from(table)
      .where(and(eq(table.ownerId, ownerId), eq(table.id, recordId)));
    if (!old) await create(ownerId, input, recordId);
    return { id: recordId, created: !old };
  };
  let projectId = seedId(ownerId, 'project');
  const [existingProject] = await rawDb
    .select({ id: projects.id })
    .from(projects)
    .where(
      and(
        eq(projects.ownerId, ownerId),
        or(
          eq(projects.id, projectId),
          and(
            eq(projects.title, 'LIFE HUD · Project #001'),
            isNull(projects.deletedAt),
          ),
        ),
      ),
    )
    .limit(1);
  if (existingProject) projectId = existingProject.id;
  if (!existingProject)
    await projectMethods.createRecord(
      ownerId,
      {
        title: 'LIFE HUD · Project #001',
        description: '明确导入的开发示例项目',
      },
      projectId,
    );
  for (const m of fixtures.moments) {
    const { key, time, ...values } = m;
    await ensure(statusMoments, key, statusMethods.createRecord, {
      ...values,
      recordedAt: at(time),
    });
  }
  await ensure(sleepRecords, 'sleep', sleepMethods.createRecord, {
    sleepStart: at('01:10'),
    wakeAt: at('08:05'),
  });
  for (const w of fixtures.water)
    await ensure(waterRecords, w.key, waterMethods.createRecord, {
      recordedAt: at(w.time),
      amountMl: w.amountMl,
    });
  const reflection = await ensure(
    learningRecords,
    'reflection',
    learningMethods.createRecord,
    {
      title: '过拟合与 LIFE HUD 推荐系统',
      sourceKind: 'COURSE',
      sourceRef: university.courseIds.ai,
      reflection: fixtures.reflection,
      projectId,
    },
  );
  const source = await ensure(
    learningRecords,
    'source-only',
    learningMethods.createRecord,
    {
      title: 'Agent Memory 架构文章',
      sourceKind: 'URL',
      sourceRef: 'https://example.com/agent-memory',
      reflection: null,
    },
  );
  await ensure(learningMistakes, 'mistake', mistakeMethods.createRecord, {
    title: '洛必达法则使用条件混淆',
    sourceType: 'ASSIGNMENT',
    sourceId: university.assignmentId,
    mistakeDescription: '把不符合条件的极限直接套用了法则。',
    correctUnderstanding: null,
  });
  const skillIds: Record<string, string> = {},
    fresh: Record<string, boolean> = {};
  for (const s of fixtures.skills) {
    const r = await ensure(
      skills,
      'skill-' + s.key,
      skillMethods.createRecord,
      { name: s.name, description: '明确导入的开发示例' },
    );
    skillIds[s.key] = r.id;
    fresh[s.key] = r.created;
  }
  const observedAt = new Date(
    Math.min(
      new Date(at('13:45')).getTime(),
      selectClockNow(process.env).getTime(),
    ),
  ).toISOString();
  await ensure(skillEvidence, 'ai-evidence', evidenceMethods.createRecord, {
    skillId: skillIds.ai,
    evidenceType: 'UNDERSTANDING',
    sourceType: 'LEARNING_RECORD',
    sourceId: reflection.id,
    note: '开发示例：用户给出了自己的解释与问题。',
    confirmEvidence: true,
    observedAt,
  });
  await ensure(skillEvidence, 'design-evidence', evidenceMethods.createRecord, {
    skillId: skillIds.design,
    evidenceType: 'PRACTICE',
    sourceType: 'PROJECT',
    sourceId: projectId,
    note: '开发示例：在项目中实践产品界面设计。',
    confirmEvidence: true,
    observedAt,
  });
  await ensure(skillEvidence, 'web-evidence', evidenceMethods.createRecord, {
    skillId: skillIds.web,
    evidenceType: 'CONTACT',
    sourceType: 'LEARNING_RECORD',
    sourceId: source.id,
    observedAt,
  });
  for (const [key, state] of [
    ['ai', 'UNDERSTANDING'],
    ['design', 'PRACTICING'],
  ] as const)
    if (fresh[key]) {
      const s = await skillMethods.getRecord(ownerId, { id: skillIds[key] });
      await skillMethods.updateRecord(ownerId, {
        id: s.id,
        version: s.version,
        state,
        confirmState: true,
      });
    }
  if (includePrivateCycle)
    await ensure(cycleRecords, 'private-cycle', cycleMethods.createRecord, {
      startDate: day,
      note: '仅用于隐私验收的明确开发样例',
    });
  return {
    projectId,
    reflectionId: reflection.id,
    sourceOnlyId: source.id,
    skillIds,
  };
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    const e = process.argv.indexOf('--email');
    if (e < 0 || !process.argv[e + 1])
      throw new Error('Existing local account required');
    const [owner] = await rawDb
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, process.argv[e + 1].toLowerCase()));
    if (!owner) throw new Error('Account not found');
    const d = process.argv.indexOf('--date');
    await seedPersonal(
      owner.id,
      d >= 0 ? process.argv[d + 1] : undefined,
      process.argv.includes('--include-private-cycle'),
    );
    console.log(
      'Explicit Status/Growth fixtures saved. Existing records preserved.',
    );
  } catch {
    console.error(
      'Personal fixtures failed; select an existing development account and a suitable past/current date.',
    );
    process.exitCode = 1;
  } finally {
    await databaseClient.end({ timeout: 2 });
  }
}
