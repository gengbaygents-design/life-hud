import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { authClient } from '@/services/auth-client.service';
import { ActionButton, GlassCard, SectionHeader } from './primitives';

type MoreItem = {
  key: string;
  label: string;
  description: string;
  fixedTo?: string;
};

type MoreGroup = {
  heading: string;
  items: MoreItem[];
};

const MORE_GROUPS: MoreGroup[] = [
  {
    heading: 'LIFE',
    items: [
      { key: 'status', label: 'Status', description: '状态' },
      { key: 'wallet', label: 'Wallet', description: '钱包' },
      { key: 'social', label: 'Social', description: '社交' },
      { key: 'growth', label: 'Growth', description: '成长' },
    ],
  },
  {
    heading: 'MEMORY',
    items: [
      { key: 'archive', label: 'Archive', description: '档案' },
      { key: 'voyage', label: 'Voyage', description: '航程' },
    ],
  },
  {
    heading: 'TOOLS',
    items: [
      { key: 'reminders', label: 'Reminders', description: '提醒' },
      { key: 'search', label: 'Search', description: '搜索' },
      {
        key: 'files',
        label: 'Files',
        description: '本地文件存储',
        fixedTo: '/app/files',
      },
    ],
  },
  {
    heading: 'SETTINGS',
    items: [
      { key: 'settings', label: 'Settings', description: '设置' },
      { key: 'privacy', label: 'Privacy', description: '隐私' },
    ],
  },
];

export function MoreView() {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const handleSignOut = async () => {
    setBusy(true);
    setError('');
    try {
      const result = await authClient.signOut();
      if (result.error) throw new Error('Sign out failed');
      window.location.assign('/sign-in');
    } catch {
      setError('退出未完成，请稍后重试。');
      setBusy(false);
    }
  };

  return (
    <div className="hud-page">
      <SectionHeader
        eyebrow="EXPLORE YOUR SPACE"
        title="MORE"
        description="生活，不止一个方向。"
      />
      <div className="more-grid">
        {MORE_GROUPS.map((group) => (
          <GlassCard key={group.heading} className="more-group">
            <h2 className="more-group-heading">{group.heading}</h2>
            <ul className="more-group-list">
              {group.items.map((item) => {
                const inner = (
                  <>
                    <span className="more-label">
                      {item.label.toUpperCase()}
                    </span>
                    <span className="more-description">{item.description}</span>
                    <ArrowUpRight
                      className="more-link-icon"
                      aria-hidden="true"
                    />
                  </>
                );
                return (
                  <li key={item.key}>
                    {item.fixedTo ? (
                      <Link to="/app/files" className="more-link">
                        {inner}
                      </Link>
                    ) : (
                      <Link
                        to="/app/more/$section"
                        params={{ section: item.key }}
                        className="more-link"
                      >
                        {inner}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </GlassCard>
        ))}
      </div>
      <footer className="more-footer">
        <p className="more-footer-note">日常与回忆，都有自己的位置。</p>
        <ActionButton
          variant="ghost"
          disabled={busy}
          onClick={() => void handleSignOut()}
        >
          {busy ? '正在退出…' : '退出登录'}
        </ActionButton>
        {error && <p role="alert">{error}</p>}
      </footer>
    </div>
  );
}

// 无障碍：44px 最小触控目标由 shell 样式表中的 .more-link 与 .action-button 保证。
