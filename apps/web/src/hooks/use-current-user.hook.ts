import type { UseQueryOptions } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/services/api-client.service';


import type { User } from '@/services/api-client.service';

import { queryKey } from './use-api.hook';

type UseCurrentUserOptions = Omit<UseQueryOptions<User>, 'queryKey' | 'queryFn'>;

export const currentUserKey = queryKey(apiClient.users.getCurrent);

export function useCurrentUser(options?: UseCurrentUserOptions) {
  return useQuery<User>({
    queryKey: currentUserKey,
    queryFn: () => apiClient.users.getCurrent(),
    staleTime: Number.POSITIVE_INFINITY,
    ...options,
  });
}
