import {
  ActionButton,
  StatusChip,
  EmptyState,
} from '@/components/shell/primitives';
import { useLim } from '@/components/shell/lim-state';

export type ScheduleRow = {
  id: string;
  courseName: string;
  specificDate: string;
  startTime: string;
  endTime: string;
  placeName: string | null;
};

export type AssignmentWorkState = 'NOT_STARTED' | 'IN_PROGRESS' | 'DONE';
export type AssignmentSubmissionState = 'NOT_SUBMITTED' | 'SUBMITTED';

export type StudyAssignment = {
  id: string;
  title: string;
  dueAt: string | null;
  workState: AssignmentWorkState;
  submissionState: AssignmentSubmissionState;
  submittedAt: string | null;
  taskId: string | null;
};

const WORK_LABEL: Record<AssignmentWorkState, string> = {
  DONE: '已完成',
  IN_PROGRESS: '进行中',
  NOT_STARTED: '尚未开始',
};

type ClassListProps = {
  rows: ScheduleRow[];
  currentId?: string;
  nextId?: string;
};

export function ClassList({ rows, currentId, nextId }: ClassListProps) {
  if (rows.length === 0) {
    return <EmptyState title="安静的一天" />;
  }
  return (
    <ul className="schedule-list">
      {rows.map((row) => (
        <li key={row.id} className="study-class-row">
          <div className="study-class-state">
            {row.id === currentId ? (
              <StatusChip tone="success">正在上课</StatusChip>
            ) : null}
            {row.id === nextId ? <StatusChip>下一节</StatusChip> : null}
          </div>
          <div className="study-class-time">
            <span className="schedule-time">
              {row.startTime}–{row.endTime}
            </span>
            <span className="schedule-date">{row.specificDate}</span>
          </div>
          <div className="study-class-title">
            <span className="schedule-course">{row.courseName}</span>
            <span className="schedule-place">{row.placeName ?? '待定'}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

type AssignmentCardProps = {
  assignment: StudyAssignment;
  courseName: string;
  busy: boolean;
  onEdit: () => void;
  onSubmit: () => void;
  onUnsubmit: () => void;
  onDone: () => void;
};

export function AssignmentCard({
  assignment,
  courseName,
  busy,
  onEdit,
  onSubmit,
  onUnsubmit,
  onDone,
}: AssignmentCardProps) {
  const { openLim } = useLim();
  const { id, title, dueAt, workState, submissionState, submittedAt, taskId } =
    assignment;
  const deadline = dueAt
    ? new Date(dueAt).toLocaleString('zh-CN')
    : '无截止时间';
  const submittedLabel = submittedAt
    ? `已提交 ${new Date(submittedAt).toLocaleString('zh-CN')}`
    : '已提交';
  return (
    <article
      className="study-assignment"
      data-testid={`assignment-${id}`}
      data-pending-submission={
        workState === 'DONE' && submissionState !== 'SUBMITTED'
      }
    >
      <h3 className="study-assignment-title">{title}</h3>
      <p className="study-assignment-course">{courseName}</p>
      <p className="study-assignment-deadline">截止：{deadline}</p>
      <div className="study-assignment-status">
        <StatusChip tone={workState === 'DONE' ? 'success' : 'quiet'}>
          {WORK_LABEL[workState]}
        </StatusChip>
        <StatusChip
          tone={submissionState === 'SUBMITTED' ? 'success' : 'warning'}
        >
          {submissionState === 'SUBMITTED' ? submittedLabel : '未提交'}
        </StatusChip>
      </div>
      <div className="study-assignment-actions">
        <ActionButton
          variant="ghost"
          onClick={() =>
            openLim({ sourceEntity: { type: 'ASSIGNMENT', id, label: title } })
          }
        >
          问 Lim
        </ActionButton>
        <ActionButton variant="ghost" onClick={onEdit} disabled={busy}>
          编辑作业
        </ActionButton>
        {submissionState === 'SUBMITTED' ? (
          <ActionButton variant="ghost" onClick={onUnsubmit} disabled={busy}>
            更正为未提交
          </ActionButton>
        ) : (
          <ActionButton onClick={onSubmit} disabled={busy}>
            标记已提交
          </ActionButton>
        )}
        {workState !== 'DONE' ? (
          <ActionButton variant="ghost" onClick={onDone} disabled={busy}>
            标记作业已完成
          </ActionButton>
        ) : null}
        {taskId ? <a href="/app/quest">到QUEST安排</a> : null}
      </div>
    </article>
  );
}
