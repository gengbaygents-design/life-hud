import { and, eq, isNull, ne, desc, inArray, gte, lte } from 'drizzle-orm';
import { rawDb } from '@/db';
import { auditSensitiveRead } from '../../personal-access';
import { statusMoments } from '../../status-moments/status-moments.schema';
import { sleepRecords } from '../../sleep-records/sleep-records.schema';
import { waterRecords } from '../../water-records/water-records.schema';
import { exerciseRecords } from '../../exercise-records/exercise-records.schema';
import { selectClockNow } from '../../core-clock';
import { toWire } from '../../core-methods';
import { inputSchema, recordSchema, snapshotSchema } from '../contract';
import { inWindow, waterTrend, sleepDuration } from './trends';
export async function getSnapshot(
  ownerId: string,
  now = selectClockNow(process.env),
) {
  const [moment] = await rawDb
    .select({
      id: statusMoments.id,
      recordedAt: statusMoments.recordedAt,
      mood: statusMoments.mood,
      customMood: statusMoments.customMood,
      energy: statusMoments.energy,
      stress: statusMoments.stress,
      focus: statusMoments.focus,
    })
    .from(statusMoments)
    .where(
      and(
        eq(statusMoments.ownerId, ownerId),
        isNull(statusMoments.deletedAt),
        inArray(statusMoments.privacyLevel, ['NORMAL', 'PRIVATE']),
        gte(statusMoments.recordedAt, new Date(now.getTime() - 86400000)),
        lte(statusMoments.recordedAt, now),
      ),
    )
    .orderBy(
      desc(statusMoments.recordedAt),
      desc(statusMoments.createdAt),
      desc(statusMoments.id),
    )
    .limit(1);
  return snapshotSchema.parse({
    asOf: now.toISOString(),
    moment: moment ? toWire(moment) : null,
  });
}
export async function getStatus(
  ownerId: string,
  input: unknown,
  now = selectClockNow(process.env),
) {
  const { days, timeZone } = inputSchema.parse(input);
  const data = await rawDb.transaction(
    async (tx) => {
      const scope = (
        t:
          | typeof statusMoments
          | typeof sleepRecords
          | typeof waterRecords
          | typeof exerciseRecords,
      ) =>
        and(
          eq(t.ownerId, ownerId),
          isNull(t.deletedAt),
          ne(t.privacyLevel, 'VAULT'),
        );
      return {
        moments: await tx
          .select()
          .from(statusMoments)
          .where(scope(statusMoments))
          .orderBy(
            desc(statusMoments.recordedAt),
            desc(statusMoments.createdAt),
            desc(statusMoments.id),
          ),
        sleep: await tx
          .select()
          .from(sleepRecords)
          .where(scope(sleepRecords))
          .orderBy(desc(sleepRecords.wakeAt)),
        water: await tx
          .select()
          .from(waterRecords)
          .where(scope(waterRecords))
          .orderBy(desc(waterRecords.recordedAt)),
        exercise: await tx
          .select()
          .from(exerciseRecords)
          .where(scope(exerciseRecords))
          .orderBy(desc(exerciseRecords.startedAt)),
      };
    },
    { isolationLevel: 'repeatable read', accessMode: 'read only' },
  );
  const moments = data.moments.filter((m) =>
    inWindow(m.recordedAt, now, timeZone, days),
  );
  await auditSensitiveRead(
    ownerId,
    [
      ...moments.map((r) => ({
        kind: 'STATUS_MOMENT',
        id: r.id,
        privacyLevel: r.privacyLevel,
      })),
      ...data.sleep
        .filter((s) => inWindow(s.wakeAt, now, timeZone, days))
        .map((r) => ({
          kind: 'SLEEP_RECORD',
          id: r.id,
          privacyLevel: r.privacyLevel,
        })),
      ...data.water
        .filter((w) => inWindow(w.recordedAt, now, timeZone, days))
        .map((r) => ({
          kind: 'WATER_RECORD',
          id: r.id,
          privacyLevel: r.privacyLevel,
        })),
      ...data.exercise
        .filter((e) => inWindow(e.startedAt, now, timeZone, days))
        .map((r) => ({
          kind: 'EXERCISE_RECORD',
          id: r.id,
          privacyLevel: r.privacyLevel,
        })),
    ],
    'STATUS_VIEW',
  );
  return recordSchema.parse({
    asOf: now.toISOString(),
    days,
    moments: moments.map(toWire),
    sleep: data.sleep
      .filter((s) => inWindow(s.wakeAt, now, timeZone, days))
      .map((s) => ({
        ...toWire(s),
        durationMinutes: sleepDuration(s.sleepStart, s.wakeAt),
      })),
    water: data.water
      .filter((w) => inWindow(w.recordedAt, now, timeZone, days))
      .map(toWire),
    exercise: data.exercise
      .filter((e) => inWindow(e.startedAt, now, timeZone, days))
      .map(toWire),
    waterByDay: waterTrend(data.water, now, timeZone, days),
    energyTrend: moments
      .filter((m) => m.energy !== null)
      .map((m) => ({
        id: m.id,
        recordedAt: m.recordedAt.toISOString(),
        energy: m.energy,
      })),
  });
}
