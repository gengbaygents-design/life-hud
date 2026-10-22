import { useApiQuery } from '@/hooks';
import { apiClient } from '@/services/api-client.service';
export type HomeData=Awaited<ReturnType<typeof apiClient.home.get>>;
export function useHome(enabled=true){
  const timeZone=Intl.DateTimeFormat().resolvedOptions().timeZone||'Asia/Shanghai';
  return useApiQuery(apiClient.home.get,{timeZone},{enabled,retry:false,placeholderData:undefined,staleTime:5000,refetchOnWindowFocus:true,refetchOnReconnect:true,refetchInterval:query=>{
    const data=query.state.data;
    return data?Math.max(1000,Math.min(15000,Date.parse(data.nextRefreshAt)-Date.parse(data.asOf))):15000;
  }});
}
