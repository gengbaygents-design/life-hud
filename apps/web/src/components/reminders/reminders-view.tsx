import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { useApiQuery } from '@/hooks';
import { apiClient } from '@/services/api-client.service';
import {
  LoadingState,
  SectionHeader,
  ActionButton,
  EmptyState,
  Modal,
} from '@/components/shell/primitives';
import { RuleCard, NotificationCard } from './cards';
import '@/components/archive/foundation.css';
const api = apiClient['reminder-rules'],
  notifications = apiClient['notification-instances'];
export function RemindersView() {
  const rules = useApiQuery(
      api.list,
      {},
      { retry: false, refetchInterval: 10000 },
    ),
    inbox = useApiQuery(
      notifications.list,
      {},
      { retry: false, refetchInterval: 10000 },
    ),
    cache = useQueryClient();
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [tab, setTab] = useState('upcoming');
  const [title, setTitle] = useState(''),
    [when, setWhen] = useState(''),
    [priority, setPriority] = useState<'P0' | 'P1' | 'P2' | 'P3'>('P2'),
    [critical, setCritical] = useState(false),
    [quietStart, setQuietStart] = useState('23:30'),
    [quietEnd, setQuietEnd] = useState('07:30'),
    [policy, setPolicy] = useState<'DEFER' | 'SILENT'>('DEFER');
  const refresh = () =>
    Promise.all(
      ['reminder-rules', 'notification-instances', 'home'].map((key) =>
        cache.invalidateQueries({ queryKey: [key] }),
      ),
    );
  async function run(fn: () => Promise<unknown>) {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await fn();
      await refresh();
    } catch {
      setError('操作未完成，请检查时间或刷新后重试。');
    } finally {
      setBusy(false);
    }
  }
  const timeZone =
    Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Shanghai';
  return (
    <section className="hud-page phase7-page">
      <Link to="/app/more">返回 MORE</Link>
      <SectionHeader
        eyebrow="LIFE HUD / TOOLS"
        title="REMINDERS"
        description="在需要的时候，轻轻提醒。"
      />
      <ActionButton onClick={() => setOpen(true)}>设置提醒</ActionButton>
      <div className="phase7-tabs" role="group" aria-label="提醒视图">
        {[
          ['upcoming', '提醒安排'],
          ['unread', '未读'],
          ['recent', '最近通知'],
          ['dismissed', '已收起'],
        ].map(([key, label]) => (
          <ActionButton
            key={key}
            variant={tab === key ? 'default' : 'ghost'}
            onClick={() => setTab(key)}
          >
            {label}
          </ActionButton>
        ))}
      </div>
      {(error || rules.isError || inbox.isError) && (
        <p role="alert">{error || '暂时无法读取提醒，请重试。'}</p>
      )}
      {(rules.isPending || inbox.isPending) && (
        <LoadingState label="正在读取…" />
      )}
      <div className="phase7-list">
        {tab === 'upcoming' ? (
          <>
            {rules.data?.map((rule) => (
              <RuleCard
                key={rule.id}
                rule={rule}
                busy={busy}
                onCancel={() =>
                  void run(() =>
                    api.cancel({ id: rule.id, version: rule.version }),
                  )
                }
              />
            ))}
            {rules.data?.length === 0 && (
              <EmptyState
                title="没有待安排的提醒"
                description="需要的时候再设置就好。"
              />
            )}
          </>
        ) : (
          <>
            {inbox.data
              ?.filter((n) =>
                tab === 'unread'
                  ? n.status === 'DELIVERED'
                  : tab === 'dismissed'
                    ? n.status === 'DISMISSED'
                    : n.status !== 'DISMISSED',
              )
              .map((item) => (
                <NotificationCard
                  key={item.id}
                  item={item}
                  busy={busy}
                  onRead={() =>
                    void run(() =>
                      notifications.state({
                        id: item.id,
                        version: item.version,
                        action: 'READ',
                      }),
                    )
                  }
                  onDismiss={() =>
                    void run(() =>
                      notifications.state({
                        id: item.id,
                        version: item.version,
                        action: 'DISMISS',
                      }),
                    )
                  }
                />
              ))}
            {inbox.data?.filter((n) =>
              tab === 'unread'
                ? n.status === 'DELIVERED'
                : tab === 'dismissed'
                  ? n.status === 'DISMISSED'
                  : n.status !== 'DISMISSED',
            ).length === 0 && <EmptyState title="这里很安静" />}
          </>
        )}
      </div>
      <Modal
        open={open}
        onOpenChange={setOpen}
        title="设置提醒"
        description="只设置提醒，不创建任务。"
      >
        <form
          className="phase7-form"
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              const row = await api.create({
                title,
                scheduledAt: new Date(when).toISOString(),
                priority,
                confirmCritical: critical,
                timeZone,
                quietStart,
                quietEnd,
                quietHoursPolicy: policy,
              });
              if (row.status === 'CANCELLED')
                throw new Error('Previously cancelled');
              setOpen(false);
              setTitle('');
              setWhen('');
            });
          }}
        >
          <label>
            提醒内容
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              required
            />
          </label>
          <label>
            提醒时间
            <input
              type="datetime-local"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
              required
            />
          </label>
          <label>
            重要程度
            <select
              value={priority}
              onChange={(e) => {
                setPriority(e.target.value as typeof priority);
                setCritical(false);
              }}
            >
              <option value="P2">普通</option>
              <option value="P1">重要</option>
              <option value="P3">轻提醒</option>
              <option value="P0">关键 · 可打断安静时段</option>
            </select>
          </label>
          {priority === 'P0' && (
            <label className="phase7-check">
              <input
                type="checkbox"
                checked={critical}
                onChange={(e) => setCritical(e.target.checked)}
              />
              我确认这是少见的关键提醒，需要绕过安静时段
            </label>
          )}
          <div className="phase7-row">
            <label>
              安静开始
              <input
                type="time"
                value={quietStart}
                onChange={(e) => setQuietStart(e.target.value)}
                required
              />
            </label>
            <label>
              安静结束
              <input
                type="time"
                value={quietEnd}
                onChange={(e) => setQuietEnd(e.target.value)}
                required
              />
            </label>
          </div>
          <label>
            安静时段内
            <select
              value={policy}
              onChange={(e) => setPolicy(e.target.value as typeof policy)}
            >
              <option value="DEFER">延后到安静时段结束</option>
              <option value="SILENT">静默送达</option>
            </select>
          </label>
          <p className="muted">时区：{timeZone}。通知送达本地提醒页。</p>
          {error && <p role="alert">{error}</p>}
          <ActionButton
            type="submit"
            disabled={busy || (priority === 'P0' && !critical)}
          >
            {busy ? '正在保存…' : '保存提醒'}
          </ActionButton>
        </form>
      </Modal>
    </section>
  );
}
