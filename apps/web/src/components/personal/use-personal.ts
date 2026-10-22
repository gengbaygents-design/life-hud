import { useApiQuery } from '@/hooks/use-api.hook';
import { apiClient } from '@/services/api-client.service';
export const privacyOptions = [
  { value: 'PRIVATE', label: '私密' },
  { value: 'NORMAL', label: '普通' },
  { value: 'HIGH_PRIVATE', label: '高隐私' },
];
export const skillLabels: Record<string, string> = {
  EXPOSED: '接触中',
  UNDERSTANDING: '理解中',
  PRACTICING: '实践中',
  INDEPENDENT: '独立使用',
  TRANSFER: '迁移中',
  PROVEN: '已有证明',
};
export const evidenceLabels: Record<string, string> = {
  CONTACT: '接触',
  UNDERSTANDING: '自己的解释',
  PRACTICE: '练习',
  INDEPENDENT: '独立完成',
  TRANSFER: '实际迁移',
  OUTPUT: '真实产出',
};
export function useSnapshot(enabled = true) {
  return useApiQuery(
    apiClient.status.snapshot,
    {},
    {
      enabled,
      retry: false,
      placeholderData: undefined,
      refetchInterval: 60000,
    },
  );
}
export function useStatus(days = 7) {
  return useApiQuery(
    apiClient.status.get,
    { days, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
    { retry: false, placeholderData: undefined },
  );
}
export function useGrowth() {
  return useApiQuery(
    apiClient.growth.get,
    {},
    { retry: false, placeholderData: undefined },
  );
}
export function errorText(e: unknown) {
  const x = e as { status?: number; code?: string; message?: string };
  if (x.status === 409 || x.code === 'CONFLICT')
    return '记录已更新，你的输入已保留。请关闭后重新读取。';
  if (
    (x.status === 400 || x.code === 'BAD_REQUEST') &&
    x.message &&
    !/validation/i.test(x.message)
  )
    return x.message;
  return '未能保存，请检查输入和本地服务后重试。';
}
export const localInput = (iso: string) => {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
};
export type GrowthData = Awaited<ReturnType<typeof apiClient.growth.get>>;
