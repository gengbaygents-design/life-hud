import type { ReactNode } from 'react';
import { useLocation, useNavigate } from '@tanstack/react-router';
import LifeHudShell from './life-hud-shell';
export default function MainLayout({children}:{children:ReactNode}) {
 const pathname=useLocation({select:location=>location.pathname});const navigate=useNavigate();
 return <LifeHudShell pathname={pathname} onNavigate={to=>{void navigate({to});}}>{children}</LifeHudShell>;
}
