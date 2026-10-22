import { and, eq, isNull, inArray } from 'drizzle-orm';
import { cloudStorageService } from '@ship/cloud-storage';
import { rawDb } from '@/db';
import { files } from '../files.schema';
import { courseMaterialLinks } from '../../course-material-links/course-material-links.schema';
import { learningRecords } from '../../learning-records/learning-records.schema';
import { learningMistakes } from '../../learning-mistakes/learning-mistakes.schema';
import { skillEvidence } from '../../skill-evidence/skill-evidence.schema';
import { assertOwnedKey } from '../middlewares/owned-key';
import {
  domainWrite,
  notFound,
  conflict,
  recordChange,
  toWire,
} from '../../core-methods';
export async function registerUploadedFile(
  ownerId: string,
  input: { key: string; name: string; contentType: string; size: number },
) {
  assertOwnedKey(ownerId, input.key);
  return domainWrite(async (tx) => {
    const [row] = await tx
      .insert(files)
      .values({ ...input, ownerId })
      .returning();
    await recordChange(tx, ownerId, 'FILE', row.id, 'FileUploaded', {
      size: row.size,
    });
    return toWire(row);
  });
}
export async function listRecords(ownerId: string) {
  return (
    await rawDb
      .select()
      .from(files)
      .where(and(eq(files.ownerId, ownerId), isNull(files.deletedAt)))
  ).map(toWire);
}
export async function removeOwnedFile(ownerId: string, key: string) {
  assertOwnedKey(ownerId, key);
  return domainWrite(async (tx) => {
    const [row] = await tx
      .select()
      .from(files)
      .where(and(eq(files.ownerId, ownerId), eq(files.key, key)))
      .for('update');
    if (row) {
      const [link] = await tx
        .select({ id: courseMaterialLinks.id })
        .from(courseMaterialLinks)
        .where(
          and(
            eq(courseMaterialLinks.ownerId, ownerId),
            eq(courseMaterialLinks.fileId, row.id),
            isNull(courseMaterialLinks.deletedAt),
          ),
        )
        .limit(1);
      if (link) conflict();
      const [learning] = await tx
        .select({ id: learningRecords.id })
        .from(learningRecords)
        .where(
          and(
            eq(learningRecords.ownerId, ownerId),
            inArray(learningRecords.sourceKind, ['FILE', 'IMAGE']),
            eq(learningRecords.sourceRef, row.id),
            isNull(learningRecords.deletedAt),
          ),
        )
        .limit(1);
      const [mistake] = await tx
        .select({ id: learningMistakes.id })
        .from(learningMistakes)
        .where(
          and(
            eq(learningMistakes.ownerId, ownerId),
            eq(learningMistakes.sourceType, 'FILE'),
            eq(learningMistakes.sourceId, row.id),
            isNull(learningMistakes.deletedAt),
          ),
        )
        .limit(1);
      const [evidence] = await tx
        .select({ id: skillEvidence.id })
        .from(skillEvidence)
        .where(
          and(
            eq(skillEvidence.ownerId, ownerId),
            eq(skillEvidence.sourceType, 'FILE'),
            eq(skillEvidence.sourceId, row.id),
            isNull(skillEvidence.deletedAt),
          ),
        )
        .limit(1);
      if (learning || mistake || evidence) conflict();
    }
    // Retrying an S3 delete is safe. On storage failure metadata remains unchanged.
    await cloudStorageService.deleteObject(key);
    if (row && !row.deletedAt) {
      await tx
        .update(files)
        .set({
          deletedAt: new Date(),
          updatedAt: new Date(),
          version: row.version + 1,
        })
        .where(eq(files.id, row.id));
      await recordChange(tx, ownerId, 'FILE', row.id, 'FileDeleted', {});
    }
    return { success: true };
  });
}
export async function getFileUrl(ownerId: string, id: string) {
  const [row] = await rawDb
    .select()
    .from(files)
    .where(
      and(
        eq(files.ownerId, ownerId),
        eq(files.id, id),
        isNull(files.deletedAt),
      ),
    );
  if (!row) throw notFound();
  return {
    url: await cloudStorageService.getSignedDownloadUrl(
      assertOwnedKey(ownerId, row.key),
    ),
  };
}
