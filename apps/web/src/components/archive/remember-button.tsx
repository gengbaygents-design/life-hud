import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/services/api-client.service';
import { ActionButton, Modal } from '@/components/shell/primitives';
type Source =
  | 'TASK'
  | 'ASSIGNMENT'
  | 'EXAM'
  | 'PROJECT'
  | 'VOYAGE'
  | 'COURSE'
  | 'STATUS_MOMENT'
  | 'LEARNING_RECORD'
  | 'CLASS_SESSION'
  | 'CAPTAIN_LOG';
export function RememberButton({
  source,
  privacyLevel = 'PRIVATE',
}: {
  source?: { type: Source; id: string };
  privacyLevel?: 'PRIVATE' | 'HIGH_PRIVATE' | 'VAULT';
}) {
  const [open, setOpen] = useState(false),
    [title, setTitle] = useState('这一刻'),
    [note, setNote] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [saved, setSaved] = useState(false),
    cache = useQueryClient();
  return (
    <>
      <ActionButton
        variant="ghost"
        onClick={() => {
          setOpen(true);
          setError('');
          setSaved(false);
        }}
      >
        ✨ 记住这一刻
      </ActionButton>
      <Modal
        open={open}
        onOpenChange={setOpen}
        title="记住这一刻"
        description="留一个标记，原记录仍留在原来的地方。"
      >
        <form
          className="phase7-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (busy) return;
            setBusy(true);
            setError('');
            void apiClient['archive-entries']
              .create({
                title,
                summary: note || null,
                privacyLevel,
                links: source
                  ? [{ sourceType: source.type, sourceId: source.id }]
                  : [],
              })
              .then(async () => {
                await cache.invalidateQueries({
                  queryKey: ['archive-entries'],
                });
                setSaved(true);
                setOpen(false);
              })
              .catch(() => setError('未能保存，请刷新后重试。'))
              .finally(() => setBusy(false));
          }}
        >
          <label>
            时刻名称
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              required
            />
          </label>
          <label>
            想留下的话（可留空）
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={10000}
            />
          </label>
          {error && <p role="alert">{error}</p>}
          <ActionButton type="submit" disabled={busy}>
            留下标记
          </ActionButton>
        </form>
      </Modal>
      {saved && (
        <p role="status" className="muted">
          已记住这一刻。
        </p>
      )}
    </>
  );
}
