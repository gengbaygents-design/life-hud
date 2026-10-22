import { z } from 'zod';
import { DbService } from '@ship/db';
import { auditSensitiveRead } from './personal-access';
import { and, eq, isNull } from 'drizzle-orm';
import { ownedResource, type CoreStore, type CoreRow } from './owned-resource';
import {
  assertOwned,
  domainWrite,
  expectVersion,
  conflict,
  notFound,
  invalid,
  recordChange,
  toWire,
  type CoreTx,
} from './core-methods';
import { confirmSchema, idSchema } from './core-contract';
import { selectClockNow } from './core-clock';
import {
  assertReflectionAuthor,
  validateMoment,
  validateEvidenceClaim,
  evidenceForState,
} from './personal-rules';
import { statusMoments } from './status-moments/status-moments.schema';
import { sleepRecords } from './sleep-records/sleep-records.schema';
import { waterRecords } from './water-records/water-records.schema';
import { exerciseRecords } from './exercise-records/exercise-records.schema';
import { cycleRecords } from './cycle-records/cycle-records.schema';
import { learningRecords } from './learning-records/learning-records.schema';
import { learningMistakes } from './learning-mistakes/learning-mistakes.schema';
import { skills } from './skills/skills.schema';
import { skillEvidence } from './skill-evidence/skill-evidence.schema';
import { entityLinks } from './entity-links/entity-links.schema';
type PersonalTable =
  | typeof statusMoments
  | typeof sleepRecords
  | typeof waterRecords
  | typeof exerciseRecords
  | typeof cycleRecords
  | typeof learningRecords
  | typeof learningMistakes
  | typeof skills
  | typeof skillEvidence;
const references = [
  'TASK',
  'PROJECT',
  'GOAL',
  'COURSE',
  'ASSIGNMENT',
  'LEARNING_RECORD',
  'LEARNING_MISTAKE',
  'FILE',
] as const;
async function reference(
  tx: CoreTx,
  ownerId: string,
  type: unknown,
  id: unknown,
) {
  if (
    !references.includes(type as (typeof references)[number]) ||
    typeof id !== 'string'
  )
    invalid('来源类型和记录须同时提供。');
  await assertOwned(
    tx,
    ownerId,
    type as (typeof references)[number],
    idSchema.parse({ id }).id,
  );
}
async function prepare(
  kind: string,
  tx: CoreTx,
  ownerId: string,
  data: Record<string, unknown>,
  previous?: CoreRow,
) {
  const {
    projectId: _projectId,
    confirmState,
    confirmEvidence,
    ...patch
  } = data;
  const now = selectClockNow(process.env);
  for (const key of [
    'recordedAt',
    'sleepStart',
    'wakeAt',
    'startedAt',
    'endedAt',
    'reviewedAt',
    'observedAt',
  ])
    if (patch[key] !== undefined)
      patch[key] = patch[key] ? new Date(String(patch[key])) : null;
  if (
    !previous &&
    ['STATUS_MOMENT', 'WATER_RECORD'].includes(kind) &&
    patch.recordedAt === undefined
  )
    patch.recordedAt = now;
  if (!previous && kind === 'SKILL_EVIDENCE' && patch.observedAt === undefined)
    patch.observedAt = now;
  const next = { ...previous, ...patch };
  if (kind === 'SKILL_EVIDENCE')
    await assertOwned(tx, ownerId, 'SKILL', String(next.skillId));
  if (next.sourceType != null || next.sourceId != null)
    await reference(tx, ownerId, next.sourceType, next.sourceId);
  if (kind === 'STATUS_MOMENT') {
    if (patch.bodyStateJson && Object.keys(patch.bodyStateJson).length === 0)
      patch.bodyStateJson = null;
    validateMoment({ ...next, ...patch });
  }
  if (kind === 'SLEEP_RECORD') {
    const start = next.sleepStart as Date,
      end = next.wakeAt as Date;
    if (end <= start || end.getTime() - start.getTime() > 72 * 3600000)
      invalid('请检查睡眠开始与醒来时间。');
  }
  if (
    kind === 'EXERCISE_RECORD' &&
    next.endedAt &&
    (next.endedAt as Date) < (next.startedAt as Date)
  )
    invalid('结束不能早于开始。');
  if (kind === 'CYCLE_RECORD') {
    if (next.endDate && String(next.endDate) < String(next.startDate))
      invalid('结束日期不能早于开始日期。');
    if (
      next.privacyLevel &&
      !['HIGH_PRIVATE', 'VAULT'].includes(String(next.privacyLevel))
    )
      invalid('周期记录至少为高隐私。');
  }
  if (kind === 'LEARNING_RECORD') {
    assertReflectionAuthor('USER', patch);
    if (next.sourceRef && !next.sourceKind) invalid('请选择来源类型。');
    if (next.sourceKind === 'URL') {
      let url: URL;
      try {
        url = new URL(String(next.sourceRef));
      } catch {
        invalid('请输入有效网址。');
      }
      if (
        !['http:', 'https:'].includes(url!.protocol) ||
        String(next.sourceRef).length > 2048
      )
        invalid('仅支持 HTTP/HTTPS 来源网址。');
    }
    const type = {
      FILE: 'FILE',
      IMAGE: 'FILE',
      COURSE: 'COURSE',
      ASSIGNMENT: 'ASSIGNMENT',
    }[String(next.sourceKind)];
    if (type) await reference(tx, ownerId, type, next.sourceRef);
    if (!previous) patch.createdBy = ownerId;
  }
  if (kind === 'LEARNING_MISTAKE') {
    if (!String(next.mistakeDescription ?? '').trim())
      invalid('请记录混淆点。');
    if (data.status && data.status !== 'OPEN' && data.reviewedAt === undefined)
      patch.reviewedAt = now;
    if (data.status === 'OPEN') patch.reviewedAt = null;
  }
  if (kind === 'SKILL') {
    if (previous) await assertOwned(tx, ownerId, 'SKILL', previous.id);
    if (
      next.state &&
      next.state !== 'EXPOSED' &&
      (!previous || (data.state !== undefined && data.state !== previous.state))
    ) {
      if (!previous || !confirmState)
        invalid('先添加证据，再明确确认技能状态。');
      const evidence = await tx
        .select()
        .from(skillEvidence)
        .where(
          and(
            eq(skillEvidence.ownerId, ownerId),
            eq(skillEvidence.skillId, previous.id),
            eq(
              skillEvidence.evidenceType,
              evidenceForState[String(next.state)],
            ),
            isNull(skillEvidence.deletedAt),
          ),
        );
      if (!evidence.length) invalid('当前状态需要对应类型的证据。');
      for (const e of evidence)
        await reference(tx, ownerId, e.sourceType, e.sourceId);
    }
  }
  if (kind === 'SKILL_EVIDENCE') {
    const skillId = String(next.skillId);
    await assertOwned(tx, ownerId, 'SKILL', skillId);
    if (
      previous &&
      ['skillId', 'evidenceType', 'sourceType', 'sourceId', 'observedAt'].some(
        (k) =>
          data[k] !== undefined &&
          JSON.stringify(patch[k]) !== JSON.stringify(previous[k]),
      )
    )
      invalid('证据来源与类型不可直接改写，请新增事实记录。');
    let source: null | { reflection?: unknown; applications?: unknown } = null;
    if (next.sourceType === 'LEARNING_RECORD') {
      const [record] = await tx
        .select()
        .from(learningRecords)
        .where(
          and(
            eq(learningRecords.ownerId, ownerId),
            eq(learningRecords.id, String(next.sourceId)),
            isNull(learningRecords.deletedAt),
          ),
        );
      if (!record) throw notFound();
      source = record;
    }
    validateEvidenceClaim(
      String(next.evidenceType),
      next.note,
      previous ? true : confirmEvidence === true,
      source,
    );
    if ((next.observedAt as Date) > now)
      invalid('未来时间不能作为已经发生的证据。');
  }
  return patch;
}
export function personalResource<T extends z.ZodType>(
  kind: string,
  table: PersonalTable,
  schemas: {
    createSchema: z.ZodType<Record<string, unknown>>;
    updateSchema: z.ZodType<Record<string, unknown>>;
    recordSchema: T;
  },
) {
  const base = ownedResource({
    kind,
    service: (tx) => new DbService(table, tx, kind) as unknown as CoreStore,
    ...schemas,
    publishEvents: kind === 'STATUS_MOMENT' ? 'create' : false,
    createdEvent: kind === 'STATUS_MOMENT' ? 'StatusMomentRecorded' : undefined,
    prepare: (tx, owner, data, previous) =>
      prepare(kind, tx, owner, data, previous),
    afterCreate: async (tx, owner, data, row) => {
      if (kind === 'LEARNING_RECORD' && data.projectId) {
        await assertOwned(tx, owner, 'PROJECT', String(data.projectId));
        const [link] = await tx
          .insert(entityLinks)
          .values({
            ownerId: owner,
            fromType: 'LEARNING_RECORD',
            fromId: row.id,
            toType: 'PROJECT',
            toId: String(data.projectId),
            relationType: 'APPLIED_TO',
          })
          .returning();
        await recordChange(
          tx,
          owner,
          'ENTITY_LINK',
          link.id,
          'EntityLinked',
          {
            fromType: 'LEARNING_RECORD',
            toType: 'PROJECT',
            relationType: 'APPLIED_TO',
          },
          {},
          false,
        );
      }
    },
  });
  const auditAccess = async (
    ownerId: string,
    rows: { id: string }[],
    operation: string,
  ) => {
    await auditSensitiveRead(
      ownerId,
      rows.map((row) => ({
        kind,
        id: row.id,
        privacyLevel:
          (row as { privacyLevel?: string }).privacyLevel ?? 'PRIVATE',
      })),
      operation,
    );
  };
  return {
    ...base,
    async listRecords(ownerId: string, input: unknown = {}) {
      const rows = await base.listRecords(ownerId, input);
      await auditAccess(ownerId, rows as { id: string }[], 'LIST');
      return rows;
    },
    async getRecord(ownerId: string, input: unknown) {
      const row = await base.getRecord(ownerId, input);
      await auditAccess(ownerId, [row as { id: string }], 'GET');
      return row;
    },
    async removeRecord(ownerId: string, input: unknown) {
      if (kind === 'CYCLE_RECORD') {
        const d = confirmSchema.parse(input);
        return domainWrite(async (tx) => {
          const [row] = await tx
            .select()
            .from(cycleRecords)
            .where(
              and(
                eq(cycleRecords.ownerId, ownerId),
                eq(cycleRecords.id, d.id),
                isNull(cycleRecords.deletedAt),
              ),
            )
            .for('update');
          if (!row) throw notFound();
          expectVersion(row.version, d.version);
          await tx
            .delete(cycleRecords)
            .where(
              and(
                eq(cycleRecords.ownerId, ownerId),
                eq(cycleRecords.id, row.id),
              ),
            );
          await recordChange(
            tx,
            ownerId,
            'CYCLE_RECORD',
            row.id,
            'CycleRecordErased',
            { operation: 'HARD_DELETE' },
            {},
            false,
          );
          return schemas.recordSchema.parse(
            toWire({ ...row, deletedAt: new Date(), version: row.version + 1 }),
          );
        });
      }
      if (kind !== 'SKILL_EVIDENCE') return base.removeRecord(ownerId, input);
      const d = confirmSchema.parse(input);
      return domainWrite(async (tx) => {
        const [row] = await tx
          .select()
          .from(skillEvidence)
          .where(
            and(
              eq(skillEvidence.ownerId, ownerId),
              eq(skillEvidence.id, d.id),
              isNull(skillEvidence.deletedAt),
            ),
          );
        if (!row) throw notFound();
        expectVersion(row.version, d.version);
        const [skill] = await tx
          .select()
          .from(skills)
          .where(and(eq(skills.ownerId, ownerId), eq(skills.id, row.skillId)))
          .for('update');
        if (!skill) throw notFound();
        if (
          !skill.deletedAt &&
          evidenceForState[skill.state] === row.evidenceType
        ) {
          const peers = await tx
            .select({ id: skillEvidence.id })
            .from(skillEvidence)
            .where(
              and(
                eq(skillEvidence.ownerId, ownerId),
                eq(skillEvidence.skillId, row.skillId),
                eq(skillEvidence.evidenceType, row.evidenceType),
                isNull(skillEvidence.deletedAt),
              ),
            );
          if (peers.length === 1)
            invalid('请先调整技能状态，再移除最后一条对应证据。');
        }
        const [removed] = await tx
          .update(skillEvidence)
          .set({
            deletedAt: new Date(),
            updatedAt: new Date(),
            version: d.version + 1,
          })
          .where(
            and(
              eq(skillEvidence.id, d.id),
              eq(skillEvidence.ownerId, ownerId),
              eq(skillEvidence.version, d.version),
              isNull(skillEvidence.deletedAt),
            ),
          )
          .returning();
        if (!removed) conflict();
        await recordChange(
          tx,
          ownerId,
          'SKILL_EVIDENCE',
          d.id,
          'SkillEvidenceDeleted',
          {},
          {},
          false,
        );
        return schemas.recordSchema.parse(toWire(removed));
      });
    },
  };
}
