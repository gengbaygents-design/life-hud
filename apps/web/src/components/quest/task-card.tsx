import { ActionButton, StatusChip } from '@/components/shell/primitives';
import type { apiClient } from '@/services/api-client.service';
import { useLim } from '@/components/shell/lim-state';

export type TaskRecord = Awaited<ReturnType<typeof apiClient.tasks.get>>;

const dateFormatter = new Intl.DateTimeFormat('zh-CN', {
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const STATUS_LABELS: Record<string, string> = {
  INBOX: '待安排',
  PLANNED: '已计划',
  ACTIVE: '进行中',
  COMPLETED: '已完成',
  DELAYED: '已调整',
  DROPPED: '已放下',
};

function formatDate(
  value: TaskRecord['plannedStart'] | TaskRecord['dueAt'],
): string | null {
  if (value === null || value === undefined) return null;
  const date = new Date(value as string | number | Date);
  return Number.isNaN(date.getTime()) ? null : dateFormatter.format(date);
}

export default function TaskCard({
  task,
  busy = false,
  onOpen,
  onStart,
  onComplete,
}: {
  task: TaskRecord;
  busy?: boolean;
  onOpen: (task: TaskRecord) => void;
  onStart?: (task: TaskRecord) => void;
  onComplete?: (task: TaskRecord) => void;
}) {
  const { openLim } = useLim();
  const planned = formatDate(task.plannedStart);
  const due = formatDate(task.dueAt);
  const statusLabel = STATUS_LABELS[task.status] ?? task.status;

  return (
    <article
      className="task-item"
      data-task-id={task.id}
      data-state={task.status}
    >
      <button type="button" className="task-title" onClick={() => onOpen(task)}>
        {task.title}
      </button>
      <div className="task-meta">
        <StatusChip tone={task.status === 'COMPLETED' ? 'success' : 'quiet'}>
          {statusLabel}
        </StatusChip>
        {task.importance === 'HIGH' ? <span>重要</span> : null}
        {planned ? <span>计划 {planned}</span> : null}
        {due ? <span>截止 {due}</span> : null}
        {task.estimatedMinutes ? (
          <span>预计 {task.estimatedMinutes}m</span>
        ) : null}
      </div>
      {onStart || onComplete ? (
        <div className="task-card-actions">
          {onStart ? (
            <ActionButton
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => onStart?.(task)}
            >
              开始
            </ActionButton>
          ) : null}
          {onComplete ? (
            <ActionButton
              type="button"
              variant={task.status === 'ACTIVE' ? 'default' : 'ghost'}
              disabled={busy}
              onClick={() => onComplete?.(task)}
            >
              完成
            </ActionButton>
          ) : null}
        </div>
      ) : null}
      <ActionButton
        variant="ghost"
        disabled={busy}
        onClick={() =>
          openLim({
            sourceEntity: { type: 'TASK', id: task.id, label: task.title },
          })
        }
      >
        问 Lim
      </ActionButton>
    </article>
  );
}
