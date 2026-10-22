import { useApiQuery } from '@/hooks';
import { apiClient } from '@/services/api-client.service';
export type TaskRecord = Awaited<ReturnType<typeof apiClient.tasks.get>>;
export function useCoreData(enabled = true) {
  const timeZone =
    Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Shanghai';
  const board = useApiQuery(
    apiClient.tasks.board,
    { timeZone },
    {
      enabled,
      refetchInterval: 60_000,
      retry: false,
      placeholderData: undefined,
    },
  );
  const projects = useApiQuery(
    apiClient.projects.list,
    {},
    { enabled, retry: false, placeholderData: undefined },
  );
  const voyages = useApiQuery(
    apiClient.voyages.list,
    {},
    { enabled, retry: false, placeholderData: undefined },
  );
  return { board, projects, voyages };
}
