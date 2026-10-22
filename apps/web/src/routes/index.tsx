import { createFileRoute, Link, redirect } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import MainLayout from '@/layouts/main-layout';
import config from '@/config';
import { HomeView } from '@/components/shell/home-view';
import { apiClient } from '@/services/api-client.service';
export const Route = createFileRoute('/')({
  beforeLoad: async () => {
    try {
      await apiClient.users.getCurrent(undefined, {
        signal: AbortSignal.timeout(5000),
      });
    } catch (error) {
      const authError = error as { code?: string; status?: number };
      if (authError.code === 'UNAUTHORIZED' || authError.status === 401) return;
      throw error;
    }
    throw redirect({ to: '/app' });
  },
  component: Foundation,
});
function Foundation() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const c = new AbortController();
    fetch(config.API_URL + '/health/ready', { signal: c.signal })
      .then((r) => setReady(r.ok))
      .catch(() => setReady(false));
    return () => c.abort();
  }, []);
  return (
    <MainLayout>
      <div className="public-entry">
        <p role="status">
          {ready ? '本地基础服务已连接' : '本地基础服务尚待连接'}
        </p>
        <Link to="/sign-in">登录</Link>
        <Link to="/sign-up">创建本地账户</Link>
      </div>
      <HomeView publicPreview />
    </MainLayout>
  );
}
