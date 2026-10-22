import type {
  AttentionItem,
  ClassCandidate,
  HomeContext,
  HomeViewModel,
  WorkCandidate,
} from './types';
const minute = 60000,
  hour = 60 * minute;
const importance = { HIGH: 0, NORMAL: 1, LOW: 2 };
const time = (value: string | null) => (value ? Date.parse(value) : Infinity);
function local(instant: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(instant);
  const get = (key: string) => parts.find((p) => p.type === key)!.value;
  return {
    day: get('year') + '-' + get('month') + '-' + get('day'),
    hour: Number(get('hour')),
  };
}
function publicItem(candidate: AttentionItem): AttentionItem {
  // Explicit projection: internal ranking inputs never become user-visible scores.
  return {
    type: candidate.type,
    title: candidate.title,
    reason: candidate.reason,
    sourceRef: candidate.sourceRef,
    state: candidate.state,
    suggestedAction: candidate.suggestedAction,
    plannedStart: candidate.plannedStart,
    dueAt: candidate.dueAt,
    endsAt: candidate.endsAt,
    estimatedMinutes: candidate.estimatedMinutes,
    courseId: candidate.courseId,
    projectTitle: candidate.projectTitle,
  };
}
function workReason(item: WorkCandidate, now: Date, zone: string): string {
  const delta = time(item.dueAt) - now.getTime();
  let reason = '';
  if (item.suggestedAction === 'SUBMIT_ASSIGNMENT')
    reason = '作业尚未标记提交，请核对提交状态。';
  else if (delta < 0) reason = '截止时间已过，请核对当前安排。';
  else if (delta <= hour)
    reason = `${Math.max(0, Math.ceil(delta / minute))}分钟后截止。`;
  else if (
    item.dueAt &&
    local(new Date(item.dueAt), zone).day === local(now, zone).day
  )
    reason =
      local(new Date(item.dueAt), zone).hour >= 18
        ? '今晚截止。'
        : '今天截止。';
  else if (item.state === 'ACTIVE')
    reason = '你已开始这项任务，先保留当前进度。';
  else if (time(item.plannedStart) <= now.getTime())
    reason = '已经到计划时间。';
  else if (item.dueAt && delta <= 24 * hour) reason = '24小时内截止。';
  else if (item.importance === 'HIGH') reason = '你标记为重要。';
  else reason = '可以先做这一小步。';
  if (item.estimatedMinutes)
    reason = reason.replace(/。$/, '') + `，预计${item.estimatedMinutes}分钟。`;
  return reason;
}
export function attentionEngine(
  context: HomeContext,
  now: Date,
  timeZone: string,
): HomeViewModel {
  const stamp = now.getTime(),
    wall = local(now, timeZone),
    night = wall.hour < 6 || wall.hour >= 23;
  const live = context.work.filter(
    (t) => !['COMPLETED', 'DROPPED'].includes(t.state),
  );
  const classes = context.classes
    .filter((c) => time(c.endsAt) > stamp)
    .sort(
      (a, b) =>
        time(a.plannedStart) - time(b.plannedStart) ||
        a.sourceRef.id.localeCompare(b.sourceRef.id),
    );
  const current = classes.find(
    (c) => time(c.plannedStart) <= stamp && stamp < time(c.endsAt),
  );
  const upcoming = classes.find((c) => time(c.plannedStart) > stamp);
  const classItem = (
    c: ClassCandidate,
    state: 'CURRENT' | 'UPCOMING',
  ): AttentionItem =>
    publicItem({
      ...c,
      state,
      reason:
        state === 'CURRENT'
          ? '你现在正在上课。'
          : `${Math.ceil((time(c.plannedStart) - stamp) / minute)}分钟后有课。`,
    });
  const gap = upcoming
    ? (time(upcoming.plannedStart) - stamp) / minute
    : Infinity;
  const critical = (t: WorkCandidate) => time(t.dueAt) <= stamp + 6 * hour;
  const eligible = live.filter((t) => {
    if (night) return critical(t) || t.state === 'ACTIVE';
    return (
      t.state === 'ACTIVE' ||
      time(t.plannedStart) <= stamp ||
      time(t.dueAt) <= stamp + 24 * hour ||
      !t.plannedStart
    );
  });
  const category = (t: WorkCandidate) =>
    critical(t)
      ? 0
      : t.state === 'ACTIVE'
        ? 1
        : time(t.plannedStart) <= stamp &&
            t.estimatedMinutes !== null &&
            t.estimatedMinutes <= 20 &&
            stamp - time(t.plannedStart) <= 2 * hour
          ? 2
          : time(t.dueAt) <= stamp + 24 * hour
            ? 3
            : time(t.plannedStart) <= stamp
              ? 4
              : 5;
  const energyFit = (t: WorkCandidate) =>
    (context.status?.energy ?? 5) <= 2
      ? t.estimatedMinutes === null
        ? 1
        : t.estimatedMinutes <= 30
          ? 0
          : 2
      : 0;
  const order = (a: WorkCandidate, b: WorkCandidate) =>
    category(a) - category(b) ||
    (category(a) === 0 ? time(a.dueAt) - time(b.dueAt) : 0) ||
    energyFit(a) - energyFit(b) ||
    importance[a.importance] - importance[b.importance] ||
    time(a.dueAt) - time(b.dueAt) ||
    time(a.plannedStart) - time(b.plannedStart) ||
    a.sourceRef.id.localeCompare(b.sourceRef.id);
  const ranked = eligible.sort(order),
    fitBeforeClass = (t: WorkCandidate) =>
      t.estimatedMinutes !== null &&
      t.estimatedMinutes <= Math.max(0, gap - 10);
  let primary: AttentionItem | null = null,
    fallback: AttentionItem | null = null;
  const workItem = (t: WorkCandidate) =>
    publicItem({ ...t, reason: workReason(t, now, timeZone) });
  if (current) {
    primary = classItem(current, 'CURRENT');
    const after = ranked.find((t) => time(t.dueAt) > time(current.endsAt));
    if (after) fallback = workItem(after);
  } else if (
    upcoming &&
    gap <= 60 &&
    (!ranked[0] ||
      gap <= 10 ||
      !critical(ranked[0]) ||
      !fitBeforeClass(ranked[0]))
  ) {
    primary = classItem(upcoming, 'UPCOMING');
    const short = ranked.find(fitBeforeClass);
    if (short) fallback = workItem(short);
  } else if (ranked[0]) {
    primary = workItem(ranked[0]);
    const alternatives = ranked
      .slice(1)
      .filter((t) => !upcoming || gap > 60 || fitBeforeClass(t));
    // Fallback is a useful alternative, not another ranked feed.
    const alternative =
      alternatives.find(
        (t) =>
          t.estimatedMinutes !== null &&
          t.estimatedMinutes <= 30 &&
          (!t.plannedStart || stamp - time(t.plannedStart) <= 2 * hour),
      ) ?? alternatives[0];
    if (alternative) fallback = workItem(alternative);
  }
  const today = [
    ...context.classes
      .filter(
        (c) =>
          local(new Date(c.plannedStart), timeZone).day === wall.day &&
          time(c.endsAt) > stamp,
      )
      .map((c) =>
        classItem(c, time(c.plannedStart) <= stamp ? 'CURRENT' : 'UPCOMING'),
      ),
    ...live
      .filter(
        (t) =>
          (t.plannedStart &&
            local(new Date(t.plannedStart), timeZone).day === wall.day) ||
          (t.dueAt && local(new Date(t.dueAt), timeZone).day === wall.day),
      )
      .map(workItem),
  ]
    .sort(
      (a, b) =>
        Math.min(time(a.plannedStart), time(a.dueAt)) -
          Math.min(time(b.plannedStart), time(b.dueAt)) ||
        a.sourceRef.id.localeCompare(b.sourceRef.id),
    )
    .slice(0, 6);
  const alerts = [...context.alerts];
  if (primary?.type === 'CLASS') {
    const conflict = ranked.find(
      (t) => critical(t) && time(t.dueAt) <= time(primary.endsAt),
    );
    if (conflict)
      alerts.push({
        code: 'DEADLINE_DURING_CLASS',
        title: `${conflict.title}：${time(conflict.dueAt) < stamp ? '截止时间已过' : '截止时间在这节课结束前'}，请核对安排。`,
        sourceRef: conflict.sourceRef,
      });
  }
  const boundaries = [
    ...classes.flatMap((c) => [time(c.plannedStart), time(c.endsAt)]),
    ...live.flatMap((t) => [
      time(t.plannedStart),
      time(t.dueAt) - 6 * hour,
      time(t.dueAt),
    ]),
    context.status ? time(context.status.recordedAt) + 24 * hour : Infinity,
  ].filter((t) => t > stamp);
  return {
    upcomingReminder:context.upcomingReminder??null,
    asOf: now.toISOString(),
    timeZone,
    currentContext: current
      ? classItem(current, 'CURRENT')
      : upcoming && gap <= 60
        ? classItem(upcoming, 'UPCOMING')
        : null,
    nextAction: primary,
    fallbackAction: fallback,
    upcomingClass: upcoming ? classItem(upcoming, 'UPCOMING') : null,
    todayItems: today,
    statusSnapshot: context.status,
    voyageSnapshot: context.voyage,
    alerts: alerts.slice(0, 3),
    emptyMessage: primary
      ? null
      : night
        ? '今晚没有必须处理的事。'
        : '此刻，可以留白。',
    nextRefreshAt: new Date(
      Math.min(stamp + 30000, ...boundaries),
    ).toISOString(),
  };
}
