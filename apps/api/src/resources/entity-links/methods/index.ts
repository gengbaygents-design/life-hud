import { and, eq, isNull, or, sql } from 'drizzle-orm';
import { rawDb } from '@/db';
import { entityLinks } from '../entity-links.schema';
import { tasks } from '../../tasks/tasks.schema';
import { createSchema, listSchema } from '../contract';
import { confirmSchema } from '../../core-contract';
import {
  assertOwned,
  conflict,
  domainWrite,
  expectVersion,
  invalid,
  notFound,
  recordChange,
  toWire,
} from '../../core-methods';
export async function createRecord(ownerId: string, input: unknown) {
  const data = createSchema.parse(input);
  return domainWrite(async (tx) => {
    if (
      data.relationType === 'APPLIED_TO' &&
      (data.fromType !== 'LEARNING_RECORD' || data.toType !== 'PROJECT')
    )
      invalid('应用关联须从学习记录指向项目。');
    if (data.fromType === data.toType && data.fromId === data.toId)
      invalid('不能建立指向自己的关联。');
    // Lock in a stable order so opposite links do not deadlock each other.
    const refs = [
      { type: data.fromType, id: data.fromId },
      { type: data.toType, id: data.toId },
    ].sort((a, b) => (a.type + a.id).localeCompare(b.type + b.id));
    for (const ref of refs) await assertOwned(tx, ownerId, ref.type, ref.id);
    if (
      data.fromType === 'TASK' &&
      data.toType === 'PROJECT' &&
      data.relationType === 'BELONGS_TO'
    ) {
      const [task] = await tx
        .select({ projectId: tasks.projectId })
        .from(tasks)
        .where(and(eq(tasks.id, data.fromId), eq(tasks.ownerId, ownerId)));
      if (task.projectId !== data.toId) invalid('请通过任务编辑修改所属项目。');
    }
    const [row] = await tx
      .insert(entityLinks)
      .values({ ...data, ownerId, metadata: data.metadata ?? null })
      .returning();
    await recordChange(
      tx,
      ownerId,
      'ENTITY_LINK',
      row.id,
      'EntityLinked',
      {
        fromType: data.fromType,
        toType: data.toType,
        relationType: data.relationType,
      },
      { version: row.version },
    );
    return toWire(row);
  });
}
export async function listRecords(ownerId: string, input: unknown) {
  const data = listSchema.parse(input);
  return (
    await rawDb
      .select()
      .from(entityLinks)
      .where(
        and(
          eq(entityLinks.ownerId, ownerId),
          isNull(entityLinks.deletedAt),
          data.entityId
            ? or(
                and(
                  eq(entityLinks.fromId, data.entityId),
                  data.entityType
                    ? eq(entityLinks.fromType, data.entityType)
                    : undefined,
                ),
                and(
                  eq(entityLinks.toId, data.entityId),
                  data.entityType
                    ? eq(entityLinks.toType, data.entityType)
                    : undefined,
                ),
              )
            : data.entityType
              ? or(
                  eq(entityLinks.fromType, data.entityType),
                  eq(entityLinks.toType, data.entityType),
                )
              : undefined,
        ),
      )
  ).map(toWire);
}
export async function removeRecord(ownerId: string, input: unknown) {
  const data = confirmSchema.parse(input);
  return domainWrite(async (tx) => {
    const [row] = await tx
      .select()
      .from(entityLinks)
      .where(
        and(
          eq(entityLinks.ownerId, ownerId),
          eq(entityLinks.id, data.id),
          isNull(entityLinks.deletedAt),
        ),
      )
      .for('update');
    if (!row) throw notFound();
    expectVersion(row.version, data.version);
    if (
      row.fromType === 'TASK' &&
      row.toType === 'PROJECT' &&
      row.relationType === 'BELONGS_TO'
    )
      invalid('请通过任务编辑移除所属项目。');
    const [removed] = await tx
      .update(entityLinks)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
        version: sql`${entityLinks.version}+1`,
      })
      .where(
        and(
          eq(entityLinks.id, row.id),
          eq(entityLinks.ownerId, ownerId),
          eq(entityLinks.version, data.version),
        ),
      )
      .returning();
    if (!removed) conflict();
    await recordChange(
      tx,
      ownerId,
      'ENTITY_LINK',
      row.id,
      'EntityUnlinked',
      { beforeVersion: row.version, afterVersion: row.version + 1 },
      { version: row.version + 1 },
    );
    return toWire(removed);
  });
}
