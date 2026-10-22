import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';

import queryClient from '@/query-client';
import { apiClient, type User } from '@/services/api-client.service';
import { queryKey } from '@/hooks/use-api.hook';
import MainLayout from '@/layouts/main-layout';
import { RouteLoadError } from '@/components/route-load-error';

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async () => {
    const key = queryKey(apiClient.users.getCurrent);
    let user = queryClient.getQueryData<User>(key);

    if (!user) {
      try {
        user = await queryClient.fetchQuery({
          queryKey: key,
          queryFn: () =>
            apiClient.users.getCurrent(undefined, {
              signal: AbortSignal.timeout(8000),
            }),
        });
      } catch (error) {
        const authError = error as { code?: string; status?: number };
        if (authError.code === 'UNAUTHORIZED' || authError.status === 401)
          throw redirect({ to: '/sign-in' });
        throw error;
      }
    }
    await queryClient.ensureQueryData({
      queryKey: ['voyages', 'ensure-current', user!.id],
      queryFn: () => apiClient.voyages.ensureCurrent({}),
      staleTime: Infinity,
    });
  },
  errorComponent: RouteLoadError,
  pendingComponent: () => <p role="status">正在连接本地服务…</p>,
  component: () => (
    <MainLayout>
      <Outlet />
    </MainLayout>
  ),
});
