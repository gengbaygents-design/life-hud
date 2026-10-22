import type { ReactNode } from 'react';
import { Info } from 'lucide-react';
import { DesktopSidebar, MobileBottomNav } from '@/components/shell/navigation';
import { ShellPopover } from '@/components/shell/primitives';
import './life-hud-shell.css';

export default function AppShell({
  children,
  pathname,
  onNavigate,
}: {
  children: ReactNode;
  pathname: string;
  onNavigate: (path: string) => void;
}) {
  return (
    <div className="hud-shell">
      <a className="skip-link" href="#hud-main">
        跳到主内容
      </a>
      <DesktopSidebar pathname={pathname} onNavigate={onNavigate} />
      <div className="workspace">
        <header className="workspace-header">
          <span className="workspace-wordmark">
            LIFE HUD <span className="muted">/ 个人航行空间</span>
          </span>
          <ShellPopover
            trigger={
              <button
                type="button"
                className="shell-info"
                aria-label="关于这个空间"
              >
                <Info size={16} aria-hidden="true" />
              </button>
            }
          >
            <h2 className="card-heading">留一点空间给自己</h2>
            <p>
              安排今天、记录感受，也给尚未决定的事情留白。按照自己的节奏前行。
            </p>
          </ShellPopover>
        </header>
        <main id="hud-main" className="workspace-content" tabIndex={-1}>
          {children}
        </main>
        <footer className="workspace-footer">
          LIFE HUD <span>保持自己的节奏。</span>
        </footer>
      </div>
      <MobileBottomNav pathname={pathname} onNavigate={onNavigate} />
    </div>
  );
}
