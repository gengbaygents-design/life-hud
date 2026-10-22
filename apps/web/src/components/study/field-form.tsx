import type { FormEvent } from 'react';
import { ActionButton } from '@/components/shell/primitives';

export type Field = {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  value?: string;
  options?: { value: string; label: string }[];
  step?: string;
  min?: number;
  max?: number;
};

type FieldFormProps = {
  title: string;
  fields: Field[];
  busy: boolean;
  error?: string;
  onSave: (values: Record<string, string>) => void;
  onCancel: () => void;
};

export default function FieldForm({
  title,
  fields,
  busy,
  error,
  onSave,
  onCancel,
}: FieldFormProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSave(
      Object.fromEntries(new FormData(event.currentTarget)) as Record<
        string,
        string
      >,
    );
  };

  return (
    <form className="task-form" onSubmit={handleSubmit}>
      <h3>{title}</h3>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      {fields.map((field) => (
        <label className="form-field" key={field.name}>
          <span>{field.label}</span>
          {field.options ? (
            <select
              aria-label={field.label}
              name={field.name}
              defaultValue={field.value ?? field.options[0]?.value ?? ''}
              required={field.required}
              disabled={busy}
            >
              {field.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : field.type === 'textarea' ? (
            <textarea
              aria-label={field.label}
              name={field.name}
              defaultValue={field.value ?? ''}
              required={field.required}
              disabled={busy}
              rows={3}
            />
          ) : (
            <input
              aria-label={field.label}
              name={field.name}
              type={field.type ?? 'text'}
              defaultValue={field.value ?? ''}
              required={field.required}
              min={field.min}
              max={field.max}
              step={field.step}
              disabled={busy}
            />
          )}
        </label>
      ))}
      <div className="form-actions">
        <ActionButton type="submit" disabled={busy}>
          保存
        </ActionButton>
        <ActionButton type="button" variant="ghost" onClick={onCancel} disabled={busy}>
          取消
        </ActionButton>
      </div>
    </form>
  );
}
