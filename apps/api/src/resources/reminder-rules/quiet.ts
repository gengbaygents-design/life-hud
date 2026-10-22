type QuietRule = {
  timeZone: string;
  quietStart: string;
  quietEnd: string;
  quietHoursPolicy: string;
  priority: string;
};
// Compare wall-clock minutes; walking real instants handles both DST gaps and repeats.
export function quietDelivery(
  rule: QuietRule,
  now: Date,
): { next: Date; silent: boolean } {
  if (rule.priority === 'P0') return { next: now, silent: false };
  const fmt = new Intl.DateTimeFormat('en', {
    timeZone: rule.timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const minutes = (s: string) =>
    Number(s.slice(0, 2)) * 60 + Number(s.slice(3));
  const start = minutes(rule.quietStart),
    end = minutes(rule.quietEnd);
  const quiet = (d: Date) => {
    const p = fmt.formatToParts(d);
    const n =
      Number(p.find((x) => x.type === 'hour')!.value) * 60 +
      Number(p.find((x) => x.type === 'minute')!.value);
    return start === end
      ? false
      : start < end
        ? n >= start && n < end
        : n >= start || n < end;
  };
  if (!quiet(now)) return { next: now, silent: false };
  if (rule.quietHoursPolicy === 'SILENT') return { next: now, silent: true };
  for (let n = 1; n <= 26 * 60; n++) {
    const next = new Date(
      Math.floor(now.getTime() / 60000) * 60000 + n * 60000,
    );
    if (!quiet(next)) return { next, silent: false };
  }
  throw new Error('Unable to resolve quiet-hours boundary');
}
