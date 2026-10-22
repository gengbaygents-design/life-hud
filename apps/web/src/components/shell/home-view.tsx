import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import {
  ActionButton,
  QuietCard,
  AlertCard,
  SectionHeader,
  StatusChip,
} from './primitives';
import { LimPresence } from './lim-presence';
import { useLim } from './lim-state';
import { Compass } from 'lucide-react';
import { useHome, type HomeData } from '@/components/home/use-home';
import { FocusCard, TodayCard } from '@/components/home/cards';
import { apiClient } from '@/services/api-client.service';
import { QuickCapture } from '@/components/personal/quick-capture';
import { moodLabels } from '@/components/personal/cards';
import '@/components/home/home.css';
type Item = NonNullable<HomeData['nextAction']>;
export function HomeView({
  publicPreview = false,
}: {
  publicPreview?: boolean;
}) {
  const { openLim } = useLim(),
    query = useHome(!publicPreview),
    cache = useQueryClient();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const home = query.data,
    moment = home?.statusSnapshot,
    loading = !publicPreview && query.isPending,
    failed = !publicPreview && query.isError;
  async function complete(item: Item) {
    if (item.sourceRef.type !== 'TASK' || busy) return;
    setBusy(true);
    setError('');
    try {
      await apiClient.tasks.complete({
        id: item.sourceRef.id,
        version: item.sourceRef.version,
      });
      await Promise.all(
        ['home', 'tasks', 'study'].map((key) =>
          cache.invalidateQueries({ queryKey: [key] }),
        ),
      );
    } catch {
      setError('未能完成任务，记录可能已更新。请核对后重试。');
      await cache.invalidateQueries({ queryKey: ['home'] });
    } finally {
      setBusy(false);
    }
  }
  const ask = (item: Item) =>
    openLim({
      sourceEntity:
        item.sourceRef.type === 'CLASS_SESSION'
          ? item.courseId
            ? { type: 'COURSE', id: item.courseId, label: item.title }
            : null
          : {
              type: item.sourceRef.type,
              id: item.sourceRef.id,
              label: item.title,
            },
    });
  return (
    <section className="hud-page">
      <div className="page-intro">
        <SectionHeader
          eyebrow="LIFE HUD"
          title="HOME"
          description="让今天，有一个清晰的起点。"
        />
        {failed && (
          <p role="alert">
            暂时无法更新安排。
            {home ? '当前保留上次读取的内容。' : '请检查本地服务后重试。'}
            <ActionButton variant="ghost" onClick={() => void query.refetch()}>
              重试
            </ActionButton>
          </p>
        )}
        {error && <p role="alert">{error}</p>}
        {home?.upcomingReminder && (
          <p className="muted" data-testid="home-reminder">
            <Link to="/app/more/$section" params={{ section: 'reminders' }}>
              即将提醒 · {home.upcomingReminder.title} ·{' '}
              {new Date(home.upcomingReminder.scheduledAt).toLocaleTimeString(
                'zh-CN',
                { timeZone: home.timeZone, hour: '2-digit', minute: '2-digit' },
              )}
            </Link>
          </p>
        )}
      </div>
      <div className="home-grid">
        <FocusCard
          home={home}
          loading={loading}
          error={failed}
          busy={busy}
          onComplete={(item) => void complete(item)}
          onAsk={ask}
        />
        <TodayCard home={home} loading={loading} error={failed} />
        <QuietCard className="home-status">
          <p className="card-kicker">STATUS · 状态</p>
          <div className="home-status-summary">
            {moment ? (
              <>
                <StatusChip tone="quiet">
                  {moment.customMood ??
                    (moment.mood ? moodLabels[moment.mood] : '已记录')}
                  {moment.energy !== null ? ` · 精力 ${moment.energy}/5` : ''}
                </StatusChip>
                <p className="muted" data-testid="home-status-time">
                  {new Date(moment.recordedAt).toLocaleString('zh-CN', {
                    timeZone: home?.timeZone,
                    month: 'numeric',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </>
            ) : (
              <p className="muted">
                {failed && !home
                  ? '状态暂时无法读取。'
                  : '尚未记录，也可以留白。'}
              </p>
            )}
            {!publicPreview && <QuickCapture />}
          </div>
        </QuietCard>
        <QuietCard className="home-lim">
          <LimPresence size="small" />
          <div>
            <ActionButton
              variant="ghost"
              aria-label="打开 Lim"
              onClick={() => openLim()}
            >
              告诉 Lim…
            </ActionButton>
            <p className="muted">理一理下一步，或只是说说此刻。</p>
          </div>
        </QuietCard>
        {!!home?.alerts.length && (
          <AlertCard className="home-brief">
            <p className="card-kicker">需要留意</p>
            {home.alerts.map((a) => (
              <p key={a.code + (a.sourceRef?.id ?? '')} className="muted">
                {a.title}
              </p>
            ))}
          </AlertCard>
        )}
        <QuietCard className="home-voyage">
          <p className="card-kicker">
            <Compass size={16} aria-hidden /> VOYAGE · 航程
          </p>
          <h2 className="card-heading">
            {home?.voyageSnapshot?.title ??
              (loading
                ? '正在读取航程…'
                : failed
                  ? '航程暂时无法读取'
                  : publicPreview
                    ? '航程，由你开启'
                    : '暂无进行中的航程')}
          </h2>
          {home?.voyageSnapshot?.projectTitle && (
            <p className="muted">{home.voyageSnapshot.projectTitle}</p>
          )}
        </QuietCard>
      </div>
    </section>
  );
}
