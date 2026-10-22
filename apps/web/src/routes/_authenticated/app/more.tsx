import {createFileRoute, Outlet, useLocation} from '@tanstack/react-router';
import { MoreView } from '@/components/shell/more-view';
export const Route=createFileRoute('/_authenticated/app/more')({component:MoreRoute});
function MoreRoute(){
  const pathname=useLocation({select:location=>location.pathname});
  return /^\/app\/more\/?$/.test(pathname)?<MoreView />:<Outlet />;
}
