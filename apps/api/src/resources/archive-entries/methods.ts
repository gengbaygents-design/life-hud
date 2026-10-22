import { and, eq, isNull } from 'drizzle-orm';
import { archiveEntries as table } from './archive-entries.schema';
import { archiveEntryLinks } from '../archive-entry-links/archive-entry-links.schema';
import { createSchema, recordSchema, removeSchema } from './contract';
import {
  assertOwned,
  domainWrite,
  expectVersion,
  invalid,
  notFound,
  recordChange,
  toWire,
} from '../core-methods';
import { selectClockNow } from '../core-clock';
import { sourceReference, privacyRank } from './sources';
import { idSchema } from '../core-contract';
export async function createEntry(
  ownerId: string,
  input: unknown,
  trustedId?: string,
) {
  const p = createSchema.parse(input);
  return domainWrite(async (tx) => {
    if (
      p.periodEnd &&
      (!p.periodStart || new Date(p.periodEnd) < new Date(p.periodStart))
    )
      invalid('请检查档案期间。');
    if (p.voyageId) await assertOwned(tx, ownerId, 'VOYAGE', p.voyageId);
    const links = [
      ...new Map(
        p.links.map((l) => [l.sourceType + ':' + l.sourceId, l]),
      ).values(),
    ];
    for (const link of links) {
      const source = await sourceReference(
        tx,
        ownerId,
        link.sourceType,
        link.sourceId,
        true,
        true,
      );
      if (
        privacyRank[source.privacyLevel ?? 'PRIVATE'] >
        privacyRank[p.privacyLevel]
      )
        invalid('档案隐私等级不能低于引用的记录。');
    }
    const { links: _links, periodStart, periodEnd, recordedAt, ...fields } = p;
    const [row] = await tx
      .insert(table)
      .values({
        ...fields,
        ...(trustedId ? { id: idSchema.parse({ id: trustedId }).id } : {}),
        ownerId,
        recordedAt: recordedAt
          ? new Date(recordedAt)
          : selectClockNow(process.env),
        periodStart: periodStart ? new Date(periodStart) : null,
        periodEnd: periodEnd ? new Date(periodEnd) : null,
      })
      .returning();
    if (links.length)
      await tx
        .insert(archiveEntryLinks)
        .values(
          links.map((link) => ({ ...link, ownerId, archiveEntryId: row.id })),
        );
    await recordChange(
      tx,
      ownerId,
      'ARCHIVE_ENTRY',
      row.id,
      'ArchiveEntryCreated',
      { archiveType: row.archiveType, referenceCount: links.length },
      {},
      false,
    );
    return recordSchema.parse(toWire(row));
  });
}
export async function removeEntry(ownerId: string, input: unknown) {
  const p = removeSchema.parse(input);
  return domainWrite(async (tx) => {
    const [row] = await tx
      .select()
      .from(table)
      .where(
        and(
          eq(table.ownerId, ownerId),
          eq(table.id, p.id),
          isNull(table.deletedAt),
        ),
      )
      .for('update');
    if (!row) throw notFound();
    expectVersion(row.version, p.version);
    await tx
      .update(table)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
        version: row.version + 1,
      })
      .where(eq(table.id, p.id));
    await recordChange(
      tx,
      ownerId,
      'ARCHIVE_ENTRY',
      p.id,
      'ArchiveEntryRemoved',
      {},
      {},
      false,
    );
    return { id: p.id };
  });
}
