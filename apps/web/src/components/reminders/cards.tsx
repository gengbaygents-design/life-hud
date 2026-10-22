'use client';

import {
  ActionButton,
  GlassCard,
  StatusChip,
} from '@/components/shell/primitives';

export type Rule = {
  id: string;
  title: string;
  scheduledAt: string;
  priority: string;
  status: string;
  quietHoursPolicy: string;
  quietStart: string;
  quietEnd: string;
  timeZone: string;
};
export type Notification = {
  id: string;
  title: string;
  priority: string;
  status: string;
  scheduledFor: string;
  deliveredAt: string | null;
  silent: boolean;
};

const priorityText: Record<string, string> = {
  P0: '紧急',
  P1: '重要',
  P2: '普通',
  P3: '轻提醒',
};

function formatWhen(value: string, timeZone: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '时间待定';
  try {
    return new Intl.DateTimeFormat('zh-CN', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone,
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat('zh-CN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  }
}

function quietLabel(policy: string) {
  return policy === 'DEFER' ? '延后到安静时段结束' : '静默送达';
}

const HUD = 'reminder-card';

export function RuleCard({
  rule,
  onCancel,
  busy,
}: {
  rule: Rule;
  onCancel: () => void;
  busy?: boolean;
}) {
  const priority = rule.priority.toUpperCase();
  const active = rule.status.toUpperCase() === 'ACTIVE';
  const finalStatus = rule.status.toUpperCase().includes('CANCEL')
    ? '已取消'
    : '已送达';
  return (
    <article data-testid={`reminder-${rule.id}`} aria-label={rule.title}>
      <GlassCard className={HUD}>
        <div className="flex items-start justify-between gap-3">
          <h3 className="break-words text-base font-semibold">{rule.title}</h3>
          <StatusChip tone="quiet">
            {priorityText[priority] ?? '普通'}
          </StatusChip>
        </div>
        <p className="mt-2 text-sm muted">
          <time dateTime={rule.scheduledAt}>
            {formatWhen(rule.scheduledAt, rule.timeZone)}
          </time>
        </p>
        <p className="muted">
          {priority === 'P0'
            ? '关键提醒，不受安静时段限制'
            : `${rule.quietStart}–${rule.quietEnd} · ${quietLabel(rule.quietHoursPolicy)}`}
        </p>
        <div className="mt-3 flex justify-end">
          {active ? (
            <ActionButton variant="ghost" onClick={onCancel} disabled={busy}>
              取消提醒
            </ActionButton>
          ) : (
            <span className="text-sm muted">{finalStatus}</span>
          )}
        </div>
      </GlassCard>
    </article>
  );
}

export function NotificationCard({
  item,
  onRead,
  onDismiss,
  busy,
}: {
  item: Notification;
  onRead: () => void;
  onDismiss: () => void;
  busy?: boolean;
}) {
  const state = item.status.toUpperCase();
  const dismissed = state === 'DISMISSED';
  const read = state === 'READ';
  const label = dismissed ? '已收起' : read ? '已读' : '未读';
  return (
    <article data-testid={`notification-${item.id}`} aria-label={item.title}>
      <GlassCard className={HUD}>
        <div className="flex items-start justify-between gap-3">
          <h3 className="break-words text-base font-semibold">{item.title}</h3>
          <span className="status-chip shrink-0">{label}</span>
        </div>
        <p className="mt-2 text-sm muted">
          <time dateTime={item.scheduledFor}>
            {formatWhen(
              item.scheduledFor,
              Intl.DateTimeFormat().resolvedOptions().timeZone,
            )}
          </time>
        </p>
        {item.silent && <p className="muted">静默送达</p>}
        <div className="mt-3 flex justify-end gap-2">
          {!read && !dismissed && (
            <ActionButton onClick={onRead} disabled={busy}>
              标为已读
            </ActionButton>
          )}
          {!dismissed && (
            <ActionButton variant="ghost" onClick={onDismiss} disabled={busy}>
              收起
            </ActionButton>
          )}
        </div>
      </GlassCard>
    </article>
  );
}
