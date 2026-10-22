import { Link } from '@tanstack/react-router';
import {
  FocusCard as FocusSurface,
  GlassCard,
  ActionButton,
  LoadingState,
} from '@/components/shell/primitives';
import type { HomeData } from './use-home';

type Item = NonNullable<HomeData['nextAction']>;

function formatTime(
  iso: string | null | undefined,
  timeZone: string | undefined,
): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  try {
    return new Intl.DateTimeFormat('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone,
    }).format(date);
  } catch {
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}

function formatDateTime(
  iso: string | null | undefined,
  timeZone: string | undefined,
): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  try {
    return new Intl.DateTimeFormat('zh-CN', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone,
    }).format(date);
  } catch {
    return date.toLocaleString('zh-CN', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}

export interface FocusCardProps {
  home: HomeData | undefined;
  loading: boolean;
  error: boolean;
  busy: boolean;
  onComplete: (item: Item) => void;
  onAsk: (item: Item) => void;
}

export function FocusCard({
  home,
  loading,
  error,
  busy,
  onComplete,
  onAsk,
}: FocusCardProps) {
  const primary = home?.nextAction ?? undefined;
  const timeZone = home?.timeZone;

  const kicker = !primary
    ? 'NEXT · 下一步'
    : primary.type === 'CLASS'
      ? primary.state === 'CURRENT'
        ? 'CURRENT · 此刻'
        : 'UPCOMING · 即将上课'
      : 'NEXT · 下一步';

  const titleText =
    primary?.title ??
    (loading
      ? '正在读取…'
      : error
        ? '暂时无法读取'
        : (home?.emptyMessage ?? '此刻，可以留白。'));

  const fallback = home?.fallbackAction;

  return (
    <FocusSurface
      className="home-next"
      data-empty={!primary}
      aria-busy={loading}
    >
      <p className="card-kicker">{kicker}</p>
      {loading ? (
        <LoadingState label="正在读取你的安排…" />
      ) : (
        <h2 className="display-title" data-testid="home-next-title">
          {titleText}
        </h2>
      )}
      {primary?.reason ? (
        <p className="next-subject">{primary.reason}</p>
      ) : null}
      {primary?.type === 'CLASS' && primary.endsAt ? (
        <p className="next-window">至 {formatTime(primary.endsAt, timeZone)}</p>
      ) : null}
      {primary && primary.type !== 'CLASS' ? (
        <div className="next-times">
          {primary.plannedStart ? (
            <span>计划 {formatDateTime(primary.plannedStart, timeZone)}</span>
          ) : null}
          {primary.dueAt ? (
            <span>截止 {formatDateTime(primary.dueAt, timeZone)}</span>
          ) : null}
        </div>
      ) : null}
      {primary?.projectTitle ? (
        <p className="next-project">{primary.projectTitle}</p>
      ) : null}
      <div className="home-focus-actions">
        {primary ? (
          <div className="next-links">
            {primary.type === 'TASK' ? (
              <Link to="/app/quest">在 QUEST 中查看</Link>
            ) : primary.courseId ? (
              <Link
                to="/app/study/$courseId"
                params={{ courseId: primary.courseId }}
              >
                查看课程
              </Link>
            ) : (
              <Link to="/app/study">查看 STUDY</Link>
            )}
          </div>
        ) : null}
        {primary && primary.type === 'TASK' ? (
          <ActionButton disabled={busy} onClick={() => onComplete(primary)}>
            完成
          </ActionButton>
        ) : null}
        {primary ? (
          <ActionButton variant="ghost" onClick={() => onAsk(primary)}>
            和 Lim 看看
          </ActionButton>
        ) : null}
      </div>
      {fallback ? (
        <div className="home-fallback" data-testid="home-fallback">
          <span className="fallback-label">
            {primary?.type === 'CLASS' && primary?.state === 'CURRENT'
              ? '下课后可看'
              : '另一选择'}
          </span>
          <span className="fallback-title">{fallback.title}</span>
          {fallback.reason ? (
            <span className="fallback-reason">{fallback.reason}</span>
          ) : null}
        </div>
      ) : null}
      <div className="orbit-illustration" aria-hidden="true" />
    </FocusSurface>
  );
}

export function TodayCard({
  home,
  loading = false,
  error = false,
}: {
  home: HomeData | undefined;
  loading?: boolean;
  error?: boolean;
}) {
  const items = (home?.todayItems ?? []).slice(0, 6);
  const upcoming = home?.upcomingClass ?? undefined;

  return (
    <GlassCard className="home-today" aria-busy={loading}>
      <p className="card-kicker">TODAY · 今日</p>
      {upcoming ? (
        <p className="muted" data-testid="home-next-class">
          下一节 · {formatDateTime(upcoming.plannedStart, home?.timeZone) ?? ''}{' '}
          {upcoming.title}
        </p>
      ) : null}
      {loading ? (
        <LoadingState label="正在读取今日安排…" />
      ) : error && !home ? (
        <p className="muted">今日安排暂时无法读取。</p>
      ) : items.length === 0 ? (
        <p className="muted">今天没有必须处理的事项。</p>
      ) : (
        <ul className="schedule-list">
          {items.map((entry) => (
            <li
              className="schedule-item"
              key={`${entry.type}:${entry.sourceRef.id}`}
            >
              <span className="time-label">
                {formatTime(
                  entry.plannedStart ?? entry.dueAt,
                  home?.timeZone,
                ) ?? '待安排'}
              </span>
              {entry.type === 'TASK' ? (
                <Link to="/app/quest">
                  <small className="schedule-kind">行动</small>
                  {entry.title}
                </Link>
              ) : entry.courseId ? (
                <Link
                  to="/app/study/$courseId"
                  params={{ courseId: entry.courseId }}
                >
                  <small className="schedule-kind">
                    {entry.type === 'CLASS' ? '课程' : '作业'}
                  </small>
                  {entry.title}
                </Link>
              ) : (
                <Link to="/app/study">
                  <small className="schedule-kind">作业</small>
                  {entry.title}
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </GlassCard>
  );
}
