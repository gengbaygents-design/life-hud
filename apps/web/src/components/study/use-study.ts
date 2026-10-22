import { useApiQuery } from '@/hooks/use-api.hook';
import { apiClient } from '@/services/api-client.service';
export function useStudy(enabled = true) {
  return useApiQuery(
    apiClient.study.get,
    {},
    {
      enabled,
      retry: false,
      refetchInterval: 5000,
      placeholderData: undefined,
    },
  );
}
export type StudyData = Awaited<ReturnType<typeof apiClient.study.get>>;
export type AssignmentRecord = StudyData['assignments'][number];
