import { useId, type FormEvent } from 'react';
import { ActionButton } from '@/components/shell/primitives';

export interface TaskDraft {
  title: string;
  description: string | null;
  plannedStart: string | null;
  plannedEnd: string | null;
  dueAt: string | null;
  importance: 'LOW' | 'NORMAL' | 'HIGH';
  estimatedMinutes: number | null;
  projectId: string | null;
}

export interface TaskEditorProps {
  initial?: Partial<TaskDraft> & {sourceType?:string|null};
  projects: { id: string; title: string }[];
  busy: boolean;
  error?: string;
  onSave: (draft: TaskDraft) => void;
  onCancel: () => void;
}

function localInputFromIso(value: string | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (part: number): string => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function textOrNull(value: FormDataEntryValue | null): string | null {
  const text = typeof value === 'string' ? value.trim() : '';
  return text.length > 0 ? text : null;
}

function isoOrNull(value: FormDataEntryValue | null): string | null {
  const text = textOrNull(value);
  return text === null ? null : new Date(text).toISOString();
}

export default function TaskEditor({
  initial,
  projects,
  busy,
  error,
  onSave,
  onCancel,
}: TaskEditorProps) {
  const titleId = useId();
  const descriptionId = useId();
  const plannedStartId = useId();
  const plannedEndId = useId();
  const dueAtId = useId();
  const importanceId = useId();
  const estimateId = useId();
  const projectId = useId();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const estimateRaw = textOrNull(data.get('estimatedMinutes'));
    onSave({
      title: String(data.get('title') ?? '').trim(),
      description: textOrNull(data.get('description')),
      plannedStart: isoOrNull(data.get('plannedStart')),
      plannedEnd: isoOrNull(data.get('plannedEnd')),
      dueAt: isoOrNull(data.get('dueAt')),
      importance: String(
        data.get('importance') ?? 'NORMAL',
      ) as TaskDraft['importance'],
      estimatedMinutes: estimateRaw === null ? null : Number(estimateRaw),
      projectId: textOrNull(data.get('projectId')),
    });
  };

  return (
    <form className="task-form" onSubmit={handleSubmit}>
      {error ? (
        <p className="task-form-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="form-field">
        <label htmlFor={titleId}>标题</label>
        <input
          id={titleId}
          name="title"
          type="text"
          defaultValue={initial?.title ?? ''}
          maxLength={255}
          required
          autoFocus
          disabled={busy}
        />
      </div>
      <div className="form-grid">
        <div className="form-field">
          <label htmlFor={importanceId}>重要程度</label>
          <select
            id={importanceId}
            name="importance"
            defaultValue={initial?.importance ?? 'NORMAL'}
            disabled={busy}
          >
            <option value="LOW">低</option>
            <option value="NORMAL">普通</option>
            <option value="HIGH">高</option>
          </select>
        </div>
        <div className="form-field">
          <label htmlFor={estimateId}>预估分钟数</label>
          <input
            id={estimateId}
            name="estimatedMinutes"
            type="number"
            min={1}
            max={10080}
            defaultValue={initial?.estimatedMinutes ?? ''}
            disabled={busy}
          />
        </div>
        <div className="form-field">
          <label htmlFor={projectId}>所属项目</label>
          <select
            id={projectId}
            name="projectId"
            defaultValue={initial?.projectId ?? ''}
            disabled={busy}
          >
            <option value="">未分配</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.title}
              </option>
            ))}
          </select>
        </div>
      </div>
      <details className="task-form-details">
        <summary>更多安排与说明</summary>
        <div className="form-field">
          <label htmlFor={descriptionId}>说明</label>
          <textarea
            id={descriptionId}
            name="description"
            defaultValue={initial?.description ?? ''}
            rows={4}
            maxLength={10000}
            disabled={busy}
          />
        </div>
        <div className="form-grid">
          <div className="form-field">
            <label htmlFor={plannedStartId}>计划开始</label>
            <input
              id={plannedStartId}
              name="plannedStart"
              type="datetime-local"
              defaultValue={localInputFromIso(initial?.plannedStart)}
              disabled={busy}
            />
          </div>
          <div className="form-field">
            <label htmlFor={plannedEndId}>计划结束</label>
            <input
              id={plannedEndId}
              name="plannedEnd"
              type="datetime-local"
              defaultValue={localInputFromIso(initial?.plannedEnd)}
              disabled={busy}
            />
          </div>
          <div className="form-field">
            <label htmlFor={dueAtId}>截止时间</label>
            <input
              id={dueAtId}
              name="dueAt"
              type="datetime-local"
              readOnly={initial?.sourceType==='ASSIGNMENT'}
              defaultValue={localInputFromIso(initial?.dueAt)}
              disabled={busy}
            />
            <p className="task-form-help">{initial?.sourceType==='ASSIGNMENT'?'课程截止时间由 STUDY 作业管理。':'调整计划不会自动改变截止时间。'}</p>
          </div>
        </div>
      </details>
      <div className="task-form-actions">
        <ActionButton type="submit" disabled={busy}>
          {busy ? '保存中…' : '保存'}
        </ActionButton>
        <ActionButton
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={busy}
        >
          取消
        </ActionButton>
      </div>
    </form>
  );
}
