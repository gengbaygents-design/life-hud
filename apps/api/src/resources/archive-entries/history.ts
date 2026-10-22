import { sql, and, eq, isNull, desc } from 'drizzle-orm';
import { querySchema } from './contract';
import { archiveEntries } from './archive-entries.schema';
import { archiveEntryLinks } from '../archive-entry-links/archive-entry-links.schema';
import { semesters } from '../semesters/semesters.schema';
import { voyages } from '../voyages/voyages.schema';
import { notFound, domainWrite } from '../core-methods';
import { auditSensitiveReadIn } from '../personal-access';
import {
  sourceReference,
  sourceDefinitions,
  type ArchiveSource,
} from './sources';
import { historySchema } from './history-contract';
import { selectClockNow } from '../core-clock';
export type HistoryItem = {
  sourceType: ArchiveSource | 'ARCHIVE_ENTRY';
  sourceId: string;
  title: string;
  at: string;
  excerpt: string | null;
  version: number;
  privacyLevel: string;
  links: {
    sourceType: ArchiveSource;
    sourceId: string;
    title: string;
    available: boolean;
  }[];
};
const iso = (v: unknown) =>
  v instanceof Date ? v.toISOString() : new Date(String(v)).toISOString();
export async function getHistory(ownerId: string, input: unknown) {
  const p = querySchema.parse(input);
  return domainWrite(async (tx) => {
    let voyageId = p.voyageId,
      semesterPeriod: { start: Date; end: Date } | undefined;
    if (p.semesterId) {
      const [semester] = await tx
        .select()
        .from(semesters)
        .where(
          and(
            eq(semesters.ownerId, ownerId),
            eq(semesters.id, p.semesterId),
            isNull(semesters.deletedAt),
          ),
        );
      if (!semester || (voyageId && voyageId !== semester.voyageId))
        throw notFound();
      voyageId = semester.voyageId;
      semesterPeriod = { start: semester.startAt, end: semester.endAt };
    }
    if (voyageId) {
      const [voyage] = await tx
        .select({ id: voyages.id })
        .from(voyages)
        .where(
          and(
            eq(voyages.ownerId, ownerId),
            eq(voyages.id, voyageId),
            isNull(voyages.deletedAt),
          ),
        );
      if (!voyage) throw notFound();
    }
    const q = '%' + p.q.replace(/[\\%_]/g, '\\$&') + '%';
    const day = (column: ReturnType<typeof sql>) =>
      p.day
        ? sql`(${column} at time zone ${p.timeZone})::date=${p.day}::date`
        : sql`true`;
    const text = (column: ReturnType<typeof sql>) =>
      p.q ? sql`${column} ilike ${q}` : sql`true`;
    const privacy = (column: ReturnType<typeof sql>) =>
      p.includeSensitive ? sql`true` : sql`${column} in ('NORMAL','PRIVATE')`;
    const period = (column: ReturnType<typeof sql>) =>
      semesterPeriod
        ? sql`${column}>=${semesterPeriod.start.toISOString()}::timestamptz and ${column}<=${semesterPeriod.end.toISOString()}::timestamptz`
        : sql`true`;
    const courseScope = sql`select c.id from courses c join semesters s on s.id=c.semester_id and s.owner_id=c.owner_id join voyages v on v.id=s.voyage_id and v.owner_id=s.owner_id where c.owner_id=${ownerId} and c.deleted_at is null and s.deleted_at is null and v.deleted_at is null ${voyageId ? sql`and s.voyage_id=${voyageId}` : sql``} ${p.semesterId ? sql`and s.id=${p.semesterId}` : sql``}`;
    const scoped = Boolean(voyageId || p.semesterId),
      unscoped = scoped ? sql`false` : sql`true`;
    const rows = await tx.execute<{
      sourceType: ArchiveSource;
      sourceId: string;
      title: string;
      at: unknown;
      excerpt: string | null;
      version: number;
      privacyLevel: string;
    }>(sql`
   (select 'TASK' as "sourceType",t.id as "sourceId",t.title,t.completed_at as at,null::text as excerpt,t.version,'PRIVATE' as "privacyLevel" from tasks t where t.owner_id=${ownerId} and t.deleted_at is null and t.status='COMPLETED' and t.completed_at is not null and ${day(sql`t.completed_at`)} and ${text(sql`t.title`)} and (${unscoped} or t.source_type='ASSIGNMENT' and t.source_id in (select a.id from assignments a where a.owner_id=${ownerId} and a.course_id in (${courseScope})) ${voyageId && !p.semesterId ? sql`or t.project_id in (select id from projects where owner_id=${ownerId} and voyage_id=${voyageId} and deleted_at is null)` : sql``}) order by t.completed_at desc limit 100)
   union all
   (select 'ASSIGNMENT',a.id,a.title,coalesce(a.submitted_at,a.updated_at),null,a.version,'PRIVATE' from assignments a where a.owner_id=${ownerId} and a.deleted_at is null and a.course_id in (${courseScope}) and ${day(sql`coalesce(a.submitted_at,a.updated_at)`)} and ${text(sql`a.title`)} order by coalesce(a.submitted_at,a.updated_at) desc limit 100)
   union all
   (select 'CLASS_SESSION',cs.id,c.name,(cs.specific_date+cs.start_time::time) at time zone cs.time_zone,null,cs.version,'PRIVATE' from class_sessions cs join courses c on c.id=cs.course_id and c.owner_id=cs.owner_id where cs.owner_id=${ownerId} and cs.deleted_at is null and c.id in (${courseScope}) and ((cs.specific_date+cs.start_time::time) at time zone cs.time_zone)<=${selectClockNow(process.env).toISOString()}::timestamptz and ${day(sql`(cs.specific_date+cs.start_time::time) at time zone cs.time_zone`)} and ${text(sql`c.name`)} order by cs.specific_date desc limit 100)
   union all
   (select 'STATUS_MOMENT',id,'状态记录',recorded_at,null,version,privacy_level from status_moments where owner_id=${ownerId} and deleted_at is null and ${unscoped} and ${privacy(sql`privacy_level`)} and ${day(sql`recorded_at`)} and ${text(sql`'状态记录'`)} order by recorded_at desc limit 100)
   union all
   (select 'LEARNING_RECORD',id,title,created_at,null,version,privacy_level from learning_records where owner_id=${ownerId} and deleted_at is null and ${unscoped} and ${privacy(sql`privacy_level`)} and ${day(sql`created_at`)} and ${text(sql`title`)} order by created_at desc limit 100)
   union all
   (select 'CAPTAIN_LOG',id,'Captain’s Log',recorded_at,left(body,240),version,privacy_level from captain_logs where ${period(sql`recorded_at`)} and owner_id=${ownerId} and deleted_at is null and ${privacy(sql`privacy_level`)} and ${day(sql`recorded_at`)} and ${text(sql`body`)} ${voyageId ? sql`and voyage_id=${voyageId}` : sql``} order by recorded_at desc limit 100)
  `);
    const items: HistoryItem[] = rows.map((row) => ({
      ...row,
      at: iso(row.at),
      links: [],
    }));
    // Keyword matching linked titles remains a reference lookup, not a persisted copy.
    const linkedEntries: string[] = [];
    if (p.q) {
      for (const [type, d] of Object.entries(sourceDefinitions)) {
        const ids = await tx.execute<{ id: string }>(
          sql`select l.archive_entry_id as id from archive_entry_links l join ${d.table} on ${d.table.id}=l.source_id and ${d.table.ownerId}=l.owner_id where l.owner_id=${ownerId} and l.source_type=${type} and l.deleted_at is null and ${d.table.deletedAt} is null and ${text(d.title)} and ${privacy(d.privacy)} limit 100`,
        );
        linkedEntries.push(...ids.map((r) => r.id));
      }
    }
    const entries = await tx
      .select()
      .from(archiveEntries)
      .where(
        and(
          eq(archiveEntries.ownerId, ownerId),
          isNull(archiveEntries.deletedAt),
          privacy(sql`${archiveEntries.privacyLevel}`),
          period(sql`${archiveEntries.recordedAt}`),
          day(sql`${archiveEntries.recordedAt}`),
          voyageId ? eq(archiveEntries.voyageId, voyageId) : undefined,
          p.q
            ? sql`(${text(sql`${archiveEntries.title}`)} or ${text(sql`${archiveEntries.summary}`)} ${
                linkedEntries.length
                  ? sql`or ${archiveEntries.id} in (${sql.join(
                      linkedEntries.map((id) => sql`${id}::uuid`),
                      sql`,`,
                    )})`
                  : sql``
              })`
            : undefined,
        ),
      )
      .orderBy(desc(archiveEntries.recordedAt))
      .limit(100);
    for (const entry of entries) {
      const links = await tx
        .select()
        .from(archiveEntryLinks)
        .where(
          and(
            eq(archiveEntryLinks.ownerId, ownerId),
            eq(archiveEntryLinks.archiveEntryId, entry.id),
            isNull(archiveEntryLinks.deletedAt),
          ),
        )
        .limit(10);
      const resolved = [];
      for (const link of links)
        resolved.push(
          await sourceReference(
            tx,
            ownerId,
            link.sourceType as ArchiveSource,
            link.sourceId,
            p.includeSensitive,
          ),
        );
      items.push({
        sourceType: 'ARCHIVE_ENTRY',
        sourceId: entry.id,
        title: entry.title,
        at: entry.recordedAt.toISOString(),
        excerpt: entry.summary,
        version: entry.version,
        privacyLevel: entry.privacyLevel,
        links: resolved,
      });
    }
    items.sort(
      (a, b) =>
        b.at.localeCompare(a.at) || a.sourceId.localeCompare(b.sourceId),
    );
    const result = items.slice(0, 100);
    await auditSensitiveReadIn(
      tx,
      ownerId,
      items.map((r) => ({
        kind: r.sourceType,
        id: r.sourceId,
        privacyLevel: r.privacyLevel,
      })),
      'archive-history',
    );
    const voyageRows = await tx
      .select({ id: voyages.id, title: voyages.title, status: voyages.status })
      .from(voyages)
      .where(and(eq(voyages.ownerId, ownerId), isNull(voyages.deletedAt)))
      .orderBy(desc(voyages.createdAt))
      .limit(100);
    const semesterRows = await tx
      .select({
        id: semesters.id,
        voyageId: semesters.voyageId,
        title: semesters.name,
        status: semesters.status,
      })
      .from(semesters)
      .where(and(eq(semesters.ownerId, ownerId), isNull(semesters.deletedAt)))
      .orderBy(desc(semesters.startAt))
      .limit(100);
    return historySchema.parse({
      items: result,
      voyages: voyageRows,
      semesters: semesterRows,
    });
  });
}
