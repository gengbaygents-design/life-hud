export type TimetableRow = {
  id: string;
  specificDate: string;
  startTime: string;
  endTime: string;
  timeZone: string;
};

export type TimetableSelection<T> = {
  today: T[];
  current: T | null;
  next: T | null;
};

const formatters = new Map<string, Intl.DateTimeFormat>();

function localStamp(instant: Date, timeZone: string): string {
  let fmt = formatters.get(timeZone);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });
    formatters.set(timeZone, fmt);
  }
  const parts = new Map<string, string>(
    fmt.formatToParts(instant).map((p) => [p.type, p.value]),
  );
  const get = (type: string): string => parts.get(type) ?? '';
  return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}`;
}

function startStamp(row: TimetableRow): string {
  return `${row.specificDate} ${row.startTime}`;
}

function endStamp(row: TimetableRow): string {
  return `${row.specificDate} ${row.endTime}`;
}

function instantFor(stamp: string, timeZone: string): number {
  const target = Date.parse(stamp.replace(' ', 'T') + ':00Z');
  let instant = target;
  for (let i = 0; i < 3; i++) {
    const local = Date.parse(
      localStamp(new Date(instant), timeZone).replace(' ', 'T') + ':00Z',
    );
    const correction = target - local;
    instant += correction;
    if (!correction) break;
  }
  return instant;
}

export function selectClasses<T extends TimetableRow>(
  rows: readonly T[],
  now: Date,
): TimetableSelection<T> {
  const ordered = rows
    .map((row) => ({
      row,
      start: startStamp(row),
      end: endStamp(row),
      nowLocal: localStamp(now, row.timeZone),
    }))
    .sort(
      (a, b) =>
        instantFor(a.start, a.row.timeZone) -
          instantFor(b.start, b.row.timeZone) ||
        a.row.id.localeCompare(b.row.id),
    );

  const today = rows
    .filter(
      (row) => row.specificDate === localStamp(now, row.timeZone).slice(0, 10),
    )
    .sort(
      (a, b) =>
        a.specificDate.localeCompare(b.specificDate) ||
        a.startTime.localeCompare(b.startTime) ||
        a.id.localeCompare(b.id),
    );

  const current =
    ordered.find((e) => e.start <= e.nowLocal && e.nowLocal < e.end)?.row ??
    null;
  const next = ordered.find((e) => e.start > e.nowLocal)?.row ?? null;

  return { today, current, next };
}

export { selectClockNow } from '../../core-clock';
// Shared conversion keeps HOME and STUDY on the same real class instants.
export function classInstant(row:TimetableRow,end=false):string {
  return new Date(instantFor(end?endStamp(row):startStamp(row),row.timeZone)).toISOString();
}
