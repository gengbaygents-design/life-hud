import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ActionButton, Modal } from '@/components/shell/primitives';
import { apiClient } from '@/services/api-client.service';
import { CaptureForm } from './capture-form';
import { errorText } from './use-personal';
import './personal.css';
export function QuickCapture() {
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    cache = useQueryClient();
  const save = async (v: Record<string, string>) => {
    setBusy(true);
    setError('');
    try {
      await apiClient['status-moments'].create({
        mood: v.mood
          ? (v.mood as 'HAPPY' | 'CALM' | 'TIRED' | 'ANXIOUS' | 'SAD' | 'OTHER')
          : null,
        customMood: v.customMood || null,
        energy: v.energy ? Number(v.energy) : null,
        stress: v.stress ? Number(v.stress) : null,
        focus: v.focus ? Number(v.focus) : null,
        note: v.note || null,
        privacyLevel: (v.privacyLevel || 'PRIVATE') as
          | 'NORMAL'
          | 'PRIVATE'
          | 'HIGH_PRIVATE',
      });
      await Promise.all([
        cache.invalidateQueries({ queryKey: ['status'] }),
        cache.invalidateQueries({ queryKey: ['home'] }),
        cache.invalidateQueries({ queryKey: ['status-moments'] }),
      ]);
      setOpen(false);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <ActionButton
        variant="ghost"
        onClick={() => {
          setError('');
          setOpen(true);
        }}
      >
        记录状态
      </ActionButton>
      <Modal
        open={open}
        onOpenChange={(v) => {
          if (!busy) setOpen(v);
        }}
        title="记录状态"
        description="可以只记一项，也可以多记一点。"
      >
        <CaptureForm
          busy={busy}
          error={error}
          onSave={(v) => void save(v)}
          onCancel={() => setOpen(false)}
        />
      </Modal>
    </>
  );
}
