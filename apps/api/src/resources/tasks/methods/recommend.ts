import type { Task } from '@/db';
const terminal = new Set(['COMPLETED', 'DROPPED']);
const importance = { HIGH: 0, NORMAL: 1, LOW: 2 };
export function buildBoard(
  records: readonly Task[],
  now: Date,
  timeZone: string,
  availableMinutes?: number,
) {
  const day = (date: Date) =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  const todayKey = day(now),
    time = now.getTime();
  const live = records.filter(
    (task) => !task.deletedAt && !terminal.has(task.status),
  );
  const reason = (task: Task) =>
    task.status === 'ACTIVE'
      ? '正在进行'
      : task.dueAt && task.dueAt.getTime() <= time
        ? '已到截止时间'
        : task.dueAt && task.dueAt.getTime() <= time + 86400000
          ? '24 小时内截止'
          : task.plannedStart && task.plannedStart.getTime() <= time
            ? '已到计划时间'
            : task.importance === 'HIGH' && task.status === 'INBOX'
              ? '你标记为重要'
              : null;
  const urgency = (task: Task) =>
    task.status === 'ACTIVE'
      ? 0
      : task.dueAt && task.dueAt.getTime() <= time
        ? 1
        : task.dueAt && task.dueAt.getTime() <= time + 86400000
          ? 2
          : task.plannedStart && task.plannedStart.getTime() <= time
            ? 3
            : 4;
  const fit = (task: Task) =>
    availableMinutes &&
    task.estimatedMinutes &&
    task.estimatedMinutes > availableMinutes
      ? 1
      : 0;
  const candidates = live
    .filter((task) => reason(task))
    .sort(
      (a, b) =>
        urgency(a) - urgency(b) ||
        importance[a.importance] - importance[b.importance] ||
        fit(a) - fit(b) ||
        (a.dueAt?.getTime() ?? Infinity) - (b.dueAt?.getTime() ?? Infinity) ||
        (a.plannedStart?.getTime() ?? Infinity) -
          (b.plannedStart?.getTime() ?? Infinity) ||
        a.createdAt.getTime() - b.createdAt.getTime() ||
        a.id.localeCompare(b.id),
    );
  return {
    now: candidates
      .slice(0, 3)
      .map((task) => ({ task, reason: reason(task)! })),
    today: live
      .filter(
        (task) =>
          task.status === 'ACTIVE' ||
          (task.dueAt && day(task.dueAt) === todayKey) ||
          (task.plannedStart &&
            (day(task.plannedStart) === todayKey ||
              (task.plannedEnd &&
                day(task.plannedStart) <= todayKey &&
                day(task.plannedEnd) >= todayKey))),
      )
      .sort(
        (a, b) =>
          (a.plannedStart?.getTime() ?? a.dueAt?.getTime() ?? Infinity) -
            (b.plannedStart?.getTime() ?? b.dueAt?.getTime() ?? Infinity) ||
          a.id.localeCompare(b.id),
      ),
    inbox: live
      .filter((task) => task.status === 'INBOX')
      .sort(
        (a, b) =>
          b.createdAt.getTime() - a.createdAt.getTime() ||
          a.id.localeCompare(b.id),
      ),
  };
}
