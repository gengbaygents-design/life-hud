import { useState, type FormEvent } from 'react';
import { ActionButton } from '@/components/shell/primitives';

type Source = { type: string; id: string; label: string };
type Project = { id: string; title: string };
type Initial = {
  title: string;
  sourceKind: string | null;
  sourceRef: string | null;
  reflection: string | null;
  applications: string | null;
};

export default function LearningForm({
  busy,
  error,
  initial,
  sources,
  projects,
  onSave,
  onCancel,
}: {
  busy: boolean;
  error?: string;
  initial?: Initial;
  sources: Source[];
  projects: Project[];
  onSave: (v: Record<string, string>) => void;
  onCancel: () => void;
}) {
  const [sourceKind, setSourceKind] = useState(initial?.sourceKind ?? '');
  const isSelect =
    sourceKind === 'IMAGE' ||
    sourceKind === 'FILE' ||
    sourceKind === 'COURSE' ||
    sourceKind === 'ASSIGNMENT';
  const refOptions =
    sourceKind === 'COURSE' || sourceKind === 'ASSIGNMENT'
      ? sources.filter((s) => s.type === sourceKind)
      : sources.filter((s) => s.type === 'FILE');

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(
      new FormData(e.currentTarget).entries(),
    ) as Record<string, string>;
    onSave(data);
  }

  return (
    <form className="task-form" onSubmit={handleSubmit}>
      {error && <p role="alert">{error}</p>}
      <label className="form-field">
        标题
        <input
          name="title"
          required
          maxLength={255}
          defaultValue={initial?.title ?? ''}
          disabled={busy}
        />
      </label>
      <label className="form-field">
        来源类型
        <select
          name="sourceKind"
          aria-label="来源类型"
          value={sourceKind}
          onChange={(e) => setSourceKind(e.target.value)}
          disabled={busy}
        >
          <option value="">无</option>
          <option value="TEXT">文本</option>
          <option value="URL">链接</option>
          <option value="IMAGE">图片</option>
          <option value="FILE">文件</option>
          <option value="COURSE">课程</option>
          <option value="ASSIGNMENT">作业</option>
          <option value="OTHER">其他</option>
        </select>
      </label>
      {isSelect && (
        <label className="form-field">
          来源
          <select
            key={sourceKind}
            aria-label="来源"
            name="sourceRef"
            defaultValue={initial?.sourceRef ?? ''}
            disabled={busy}
          >
            <option value="">无</option>
            {refOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      )}
      {sourceKind === 'URL' && (
        <label className="form-field">
          来源
          <input
            key={sourceKind}
            name="sourceRef"
            type="url"
            defaultValue={initial?.sourceRef ?? ''}
            disabled={busy}
          />
        </label>
      )}
      {(sourceKind === 'OTHER' || sourceKind === 'TEXT') && (
        <label className="form-field">
          来源
          <textarea
            key={sourceKind}
            name="sourceRef"
            defaultValue={initial?.sourceRef ?? ''}
            disabled={busy}
          />
        </label>
      )}
      <label className="form-field">
        我的反思
        <textarea
          name="reflection"
          maxLength={10000}
          rows={4}
          defaultValue={initial?.reflection ?? ''}
          disabled={busy}
        />
      </label>
      <label className="form-field">
        应用
        <textarea
          name="applications"
          maxLength={10000}
          defaultValue={initial?.applications ?? ''}
          disabled={busy}
        />
      </label>
      {!initial && (
        <label className="form-field">
          关联项目
          <select aria-label="关联项目" name="projectId" disabled={busy}>
            <option value="">不关联</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </label>
      )}
      {!initial && (
        <label className="form-field">
          可见范围
          <select aria-label="可见范围" name="privacyLevel" defaultValue="PRIVATE" disabled={busy}>
            <option value="NORMAL">普通</option>
            <option value="PRIVATE">私密</option>
            <option value="HIGH_PRIVATE">高隐私</option>
          </select>
        </label>
      )}
      <div className="task-form-actions">
        <ActionButton type="submit" disabled={busy}>
          保存
        </ActionButton>
        <ActionButton type="button" variant="ghost" disabled={busy} onClick={onCancel}>
          取消
        </ActionButton>
      </div>
    </form>
  );
}
