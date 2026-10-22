import { and, eq, isNull } from 'drizzle-orm';
import { semesters } from './semesters/semesters.schema';
import { courses } from './courses/courses.schema';
import { places } from './places/places.schema';
import { files } from './files/files.schema';
import { voyages } from './voyages/voyages.schema';
import { dateOrNull, invalid, notFound, type CoreTx } from './core-methods';
import type { CoreRow } from './owned-resource';

export async function universityReference(
  tx: CoreTx,
  ownerId: string,
  kind: 'semester' | 'course' | 'place' | 'file' | 'voyage',
  id: string,
) {
  const table = {
    semester: semesters,
    course: courses,
    place: places,
    file: files,
    voyage: voyages,
  }[kind];
  const [row] = await tx
    .select({ id: table.id })
    .from(table)
    .where(
      and(
        eq(table.ownerId, ownerId),
        eq(table.id, id),
        isNull(table.deletedAt),
      ),
    )
    .for('update');
  if (!row) throw notFound();
}
export async function prepareUniversity(
  kind: string,
  tx: CoreTx,
  ownerId: string,
  data: Record<string, unknown>,
  previous?: CoreRow,
) {
  // Parent identity is stable. Moving an academic object is an explicit future action.
  for (const [key, resource] of Object.entries({
    voyageId: 'voyage',
    semesterId: 'semester',
    courseId: 'course',
    placeId: 'place',
    fileId: 'file',
  } as const)) {
    const value = data[key] === undefined ? previous?.[key] : data[key];
    if (
      previous &&
      ['voyageId', 'semesterId', 'courseId', 'fileId'].includes(key) &&
      data[key] !== undefined &&
      data[key] !== previous[key]
    )
      invalid('所属记录不能在普通编辑中更换。');
    if (value) await universityReference(tx, ownerId, resource, String(value));
  }
  if (kind === 'SEMESTER') {
    const voyageId = String(data.voyageId ?? previous?.voyageId);
    const [voyage] = await tx
      .select()
      .from(voyages)
      .where(
        and(
          eq(voyages.id, voyageId),
          eq(voyages.ownerId, ownerId),
          isNull(voyages.deletedAt),
        ),
      );
    if (
      !voyage ||
      voyage.voyageType !== 'UNIVERSITY' ||
      voyage.status !== 'ACTIVE'
    )
      invalid('学期须属于当前大学航程。');
  }
  const result = { ...data };
  for (const key of ['startAt', 'endAt', 'recordedAt'])
    if (data[key] !== undefined)
      result[key] = dateOrNull(data[key] as string | null);
  const next = { ...previous, ...result };
  if (
    next.startAt &&
    next.endAt &&
    (next.endAt as Date) < (next.startAt as Date)
  )
    invalid('结束时间不能早于开始时间。');
  if (
    kind === 'CLASS_SESSION' &&
    String(next.endTime) <= String(next.startTime)
  )
    invalid('课次须在同日结束，结束时间须晚于开始时间。');
  if (
    kind === 'GRADE' &&
    next.score != null &&
    next.maxScore != null &&
    Number(next.score) > Number(next.maxScore)
  )
    invalid('成绩不能超过满分。');
  return result;
}
