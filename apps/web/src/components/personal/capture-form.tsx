import { useState, type FormEvent } from 'react';
import { moodLabels } from './cards';
import { ActionButton } from '@/components/shell/primitives';

export type CaptureFormProps = {
  busy: boolean;
  error?: string;
  onSave: (v: Record<string, string>) => void;
  onCancel: () => void;
};

const MOODS = ['HAPPY', 'CALM', 'TIRED', 'ANXIOUS', 'SAD', 'OTHER'] as const;
const LEVELS = [1, 2, 3, 4, 5];
const METRICS = [
  ['energy', '精力'],
  ['stress', '压力'],
  ['focus', '专注'],
] as const;

export function CaptureForm({
  busy,
  error,
  onSave,
  onCancel,
}: CaptureFormProps) {
  const [mood, setMood] = useState('');
  const [customMood, setCustomMood] = useState('');

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const values = Object.fromEntries(
      Array.from(new FormData(e.currentTarget).entries()).map(([k, v]) => [
        k,
        String(v),
      ]),
    );
    onSave(values);
  };

  return (
    <form className="task-form" onSubmit={submit}>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="mood-grid" role="group" aria-label="心情">
        {MOODS.map((m) => (
          <button
            key={m}
            type="button"
            className="mood-btn"
            aria-pressed={mood === m}
            disabled={busy}
            onClick={() => setMood(mood === m ? '' : m)}
          >
            {moodLabels[m] ?? m}
          </button>
        ))}
      </div>
      {mood ? <input type="hidden" name="mood" value={mood} /> : null}
      {mood === 'OTHER' ? (
        <label className="form-field">
          我的感受
          <input
            name="customMood"
            value={customMood}
            maxLength={50}
            disabled={busy}
            onChange={(e) => setCustomMood(e.target.value)}
          />
        </label>
      ) : null}
      <details className="optional-details">
        <summary>可选详情</summary>
        {METRICS.map(([name, label]) => (
          <label className="form-field" key={name}>
            {label}
            <select aria-label={label} name={name} defaultValue="" disabled={busy}>
              <option value="">未记录</option>
              {LEVELS.map((n) => (
                <option key={n} value={String(n)}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        ))}
        <label className="form-field">
          备注
          <textarea name="note" maxLength={10000} disabled={busy} />
        </label>
        <label className="form-field">
          可见范围
          <select aria-label="可见范围" name="privacyLevel" defaultValue="PRIVATE" disabled={busy}>
            <option value="PRIVATE">私密</option>
            <option value="NORMAL">普通</option>
            <option value="HIGH_PRIVATE">高隐私</option>
          </select>
        </label>
      </details>
      <div className="task-form-actions">
        <ActionButton type="submit" disabled={busy}>
          保存状态
        </ActionButton>
        <ActionButton type="button" variant="ghost" disabled={busy} onClick={onCancel}>
          取消
        </ActionButton>
      </div>
    </form>
  );
}
