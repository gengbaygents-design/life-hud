import { useEffect, useState } from 'react';
import { useRouter, type ErrorComponentProps } from '@tanstack/react-router';
import { ActionButton } from '@/components/shell/primitives';
import '@/layouts/main-layout/life-hud-shell.css';

export function RouteLoadError({ error, reset }: ErrorComponentProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    console.error('[LIFE HUD] Route load failed', error);
  }, [error]);
  async function retry() {
    setBusy(true);
    setFailed(false);
    try {
      await router.invalidate();
      if (router.state.matches.some((match) => match.status === 'error'))
        setFailed(true);
      else reset();
    } catch (retryError) {
      console.error('[LIFE HUD] Route retry failed', retryError);
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="hud" style={{ padding: 'var(--hud-space-6, 24px)' }}>
      <h1 className="card-heading">暂时没能载入这里。</h1>
      <p role="alert">
        {failed
          ? '仍未能连接，请确认本地服务恢复后再试。'
          : '请检查本地服务是否运行，然后重试。'}
      </p>
      <div className="personal-actions">
        <ActionButton
          disabled={busy}
          aria-busy={busy}
          onClick={() => void retry()}
        >
          {busy ? '正在重试…' : '重试'}
        </ActionButton>
        <a className="text-link" href="/">
          返回入口
        </a>
      </div>
    </main>
  );
}
