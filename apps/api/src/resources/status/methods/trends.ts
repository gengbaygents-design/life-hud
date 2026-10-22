export function localDay(date: Date, zone: string) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}
export function inWindow(at: Date, now: Date, zone: string, days: number) {
  const delta =
    (Date.parse(localDay(now, zone)) - Date.parse(localDay(at, zone))) /
    86400000;
  return at <= now && delta >= 0 && delta < days;
}
export function waterTrend(
  rows: readonly { recordedAt: Date; amountMl: number }[],
  now: Date,
  zone: string,
  days: number,
) {
  const totals = new Map<string, number>();
  for (const r of rows)
    if (inWindow(r.recordedAt, now, zone, days)) {
      const day = localDay(r.recordedAt, zone);
      totals.set(day, (totals.get(day) ?? 0) + r.amountMl);
    }
  return [...totals.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, amountMl]) => ({ day, amountMl }));
}
export function sleepDuration(start: Date, end: Date) {
  return Math.round((end.getTime() - start.getTime()) / 60000);
}
