import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { useApiQuery } from '@/hooks/use-api.hook';
import { apiClient } from '@/services/api-client.service';
import {
  LoadingState,
  GlassCard,
  HUDCard,
  SectionHeader,
  ActionButton,
  EmptyState,
  Modal,
} from '@/components/shell/primitives';
import FieldForm, { type Field } from '@/components/study/field-form';
import { QuickCapture } from './quick-capture';
import { MomentCard } from './cards';
import {
  useStatus,
  errorText,
  localInput,
  privacyOptions,
} from './use-personal';
import './personal.css';
type Mode = 'sleep' | 'water' | 'exercise' | 'cycle';
const title: Record<Mode, string> = {
  sleep: '记录睡眠',
  water: '记录饮水',
  exercise: '记录运动',
  cycle: '记录周期',
};
const field = (
  name: string,
  label: string,
  type = 'text',
  required = false,
  value?: string,
): Field => ({ name, label, type, required, value });
function PrivateCycle({ onClose }: { onClose: () => void }) {
  const query = useApiQuery(
    apiClient['cycle-records'].list,
    {},
    { retry: false, refetchOnWindowFocus: false, staleTime: Infinity },
  );
  const [deleting, setDeleting] = useState<{
      id: string;
      version: number;
    } | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    cache = useQueryClient();
  return (
    <GlassCard className="personal-private">
      <h2 className="card-heading">周期 · 高隐私</h2>
      <ActionButton variant="ghost" onClick={onClose}>
        收起私密记录
      </ActionButton>
      {query.isPending ? <LoadingState label="正在读取…" /> : null}
      {query.isError ? <p role="alert">私密记录暂时无法读取。</p> : null}
      {query.data?.map((c) => (
        <article key={c.id} data-testid={'cycle-' + c.id}>
          <p>
            {c.startDate} → {c.endDate ?? '尚未记录结束日期'}
          </p>
          {c.symptomsJson?.description ? (
            <p>{String(c.symptomsJson.description)}</p>
          ) : null}
          {c.note ? <p className="personal-prose">{c.note}</p> : null}
          <ActionButton variant="ghost" onClick={() => setDeleting(c)}>
            永久删除
          </ActionButton>
        </article>
      ))}
      {query.data?.length === 0 ? (
        <p className="muted">这里还没有记录。</p>
      ) : null}
      <Modal
        open={!!deleting}
        onOpenChange={(v) => {
          if (!v && !busy) setDeleting(null);
        }}
        title="永久删除私密记录"
        description="这条周期记录将从数据库移除，无法撤销。"
      >
        {error ? <p role="alert">{error}</p> : null}
        <ActionButton
          disabled={busy}
          onClick={async () => {
            if (!deleting) return;
            setBusy(true);
            try {
              await apiClient['cycle-records'].delete({
                ...deleting,
                confirm: true,
              });
              setDeleting(null);
              await cache.invalidateQueries({ queryKey: ['cycle-records'] });
            } catch (e) {
              setError(errorText(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          确认永久删除
        </ActionButton>
      </Modal>
    </GlassCard>
  );
}
export function StatusView() {
  const [days, setDays] = useState(7),
    [mode, setMode] = useState<Mode | null>(null),
    [privateOpen, setPrivateOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [removing, setRemoving] = useState<{ id: string; version: number } | null>(
      null,
    );
  const query = useStatus(days),
    cache = useQueryClient(),
    data = query.data;
  const closePrivate = () => {
    setPrivateOpen(false);
    cache.removeQueries({ queryKey: ['cycle-records'] });
  };
  const open = (m: Mode) => {
    setError('');
    setMode(m);
  };
  const fields = (): Field[] => {
    switch (mode) {
      case 'sleep':
        return [
          field('sleepStart', '入睡时间', 'datetime-local', true),
          field('wakeAt', '醒来时间', 'datetime-local', true),
          { ...field('quality', '主观质量（1–5）', 'number'), min: 1, max: 5 },
          field('note', '备注', 'textarea'),
          { name: 'privacyLevel', label: '可见范围', options: privacyOptions },
        ];
      case 'water':
        return [
          {
            ...field('amountMl', '饮水量（ml）', 'number', true, '250'),
            min: 1,
            max: 10000,
          },
          field(
            'recordedAt',
            '记录时间',
            'datetime-local',
            true,
            localInput(data?.asOf ?? new Date().toISOString()),
          ),
        ];
      case 'exercise':
        return [
          field('activityType', '活动', 'text', true),
          field('startedAt', '开始时间', 'datetime-local', true),
          field('endedAt', '结束时间', 'datetime-local'),
          {
            ...field('durationMinutes', '记录时长（分钟）', 'number'),
            min: 1,
            max: 4320,
          },
          field('note', '备注', 'textarea'),
        ];
      case 'cycle':
        return [
          field('startDate', '开始日期', 'date', true),
          field('endDate', '结束日期', 'date'),
          field('symptoms', '身体感受', 'textarea'),
          field('note', '备注', 'textarea'),
        ];
      default:
        return [];
    }
  };
  const save = async (v: Record<string, string>) => {
    setBusy(true);
    setError('');
    try {
      switch (mode) {
        case 'sleep':
          await apiClient['sleep-records'].create({
            sleepStart: new Date(v.sleepStart).toISOString(),
            wakeAt: new Date(v.wakeAt).toISOString(),
            quality: v.quality ? Number(v.quality) : null,
            note: v.note || null,
            privacyLevel: v.privacyLevel as
              | 'NORMAL'
              | 'PRIVATE'
              | 'HIGH_PRIVATE',
          });
          break;
        case 'water':
          await apiClient['water-records'].create({
            recordedAt: new Date(v.recordedAt).toISOString(),
            amountMl: Number(v.amountMl),
          });
          break;
        case 'exercise':
          await apiClient['exercise-records'].create({
            activityType: v.activityType,
            startedAt: new Date(v.startedAt).toISOString(),
            endedAt: v.endedAt ? new Date(v.endedAt).toISOString() : null,
            durationMinutes: v.durationMinutes
              ? Number(v.durationMinutes)
              : null,
            note: v.note || null,
          });
          break;
        case 'cycle':
          await apiClient['cycle-records'].create({
            startDate: v.startDate,
            endDate: v.endDate || null,
            symptomsJson: v.symptoms ? { description: v.symptoms } : null,
            note: v.note || null,
          });
          break;
      }
      setMode(null);
      await Promise.all([
        cache.invalidateQueries({ queryKey: ['status'] }),
        cache.invalidateQueries({ queryKey: ['home'] }),
        cache.invalidateQueries({ queryKey: ['cycle-records'] }),
      ]);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  const today = data
    ? new Intl.DateTimeFormat('en-CA').format(new Date(data.asOf))
    : '';
  const todayMoments =
    data?.moments.filter(
      (m) =>
        new Intl.DateTimeFormat('en-CA').format(new Date(m.recordedAt)) ===
        today,
    ) ?? [];
  return (
    <section className="hud-page personal-workspace">
      <Link to="/app/more" className="text-link">
        返回 MORE
      </Link>
      <div className="page-intro">
        <SectionHeader
          eyebrow="LIFE HUD"
          title="STATUS"
          description="听见自己的状态。"
        />
        <QuickCapture />
      </div>
      {query.isPending ? <LoadingState label="正在读取状态…" /> : null}
      {query.isError ? (
        <p role="alert">
          状态暂时无法读取。
          <ActionButton onClick={() => query.refetch()}>重试</ActionButton>
        </p>
      ) : null}
      <HUDCard>
        <h2 className="card-heading">今日状态</h2>
        <p className="muted">
          {todayMoments.length
            ? `${todayMoments.length} 个状态瞬间，各自保留。`
            : '今天尚未记录，安静留白也可以。'}
        </p>
        <div className="personal-period" aria-label="状态时间范围">
          {[
            [1, '日'],
            [7, '周'],
            [30, '月'],
          ].map(([d, label]) => (
            <ActionButton
              key={d}
              variant="ghost"
              aria-pressed={days === d}
              onClick={() => setDays(Number(d))}
            >
              {label}
            </ActionButton>
          ))}
        </div>
      </HUDCard>
      <div className="personal-grid">
        <GlassCard>
          <h2 className="card-heading">最近状态瞬间</h2>
          <div className="personal-stack">
            {data?.moments.map((m) => (
              <MomentCard key={m.id} moment={m}>
                <ActionButton
                  variant="ghost"
                  onClick={() => {
                    setError('');
                    setRemoving(m);
                  }}
                >
                  移除记录
                </ActionButton>
              </MomentCard>
            ))}
          </div>
          {data?.moments.length === 0 ? (
            <EmptyState title="这段时间还没有状态记录" />
          ) : null}
        </GlassCard>
        <div className="personal-stack">
          <GlassCard>
            <h2 className="card-heading">睡眠</h2>
            {data?.sleep.map((s) => (
              <p key={s.id}>
                {new Date(s.wakeAt).toLocaleDateString('zh-CN')} · 记录约{' '}
                {Math.floor(s.durationMinutes / 60)}小时{s.durationMinutes % 60}
                分{s.quality ? ` · 主观质量 ${s.quality}/5` : ''}
              </p>
            ))}
            {!data?.sleep.length ? (
              <p className="muted">尚未记录睡眠。</p>
            ) : null}
            <ActionButton variant="ghost" onClick={() => open('sleep')}>
              记录睡眠
            </ActionButton>
          </GlassCard>
          <GlassCard>
            <h2 className="card-heading">饮水</h2>
            {data?.waterByDay.map((d) => (
              <p key={d.day}>
                {d.day} · {d.amountMl} ml
              </p>
            ))}
            {!data?.water.length ? (
              <p className="muted">尚未记录饮水。</p>
            ) : null}
            <ActionButton variant="ghost" onClick={() => open('water')}>
              记录饮水
            </ActionButton>
          </GlassCard>
          <GlassCard>
            <h2 className="card-heading">基本趋势</h2>
            {data?.energyTrend.map((p) => (
              <p key={p.id}>
                <time>
                  {new Date(p.recordedAt).toLocaleString('zh-CN', {
                    month: 'numeric',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </time>{' '}
                · 精力 {p.energy}/5
              </p>
            ))}
            {!data?.energyTrend.length ? (
              <p className="muted">有精力记录时，会按时间呈现在这里。</p>
            ) : null}
          </GlassCard>
        </div>
      </div>
      <details className="personal-secondary">
        <summary>运动记录</summary>
        {data?.exercise.map((e) => (
          <p key={e.id}>
            {e.activityType} · {new Date(e.startedAt).toLocaleString('zh-CN')}
            {e.durationMinutes ? ` · 记录 ${e.durationMinutes} 分钟` : ''}
          </p>
        ))}
        <ActionButton variant="ghost" onClick={() => open('exercise')}>
          记录运动
        </ActionButton>
      </details>
      <div className="personal-secondary">
        <ActionButton
          variant="ghost"
          onClick={() => setPrivateOpen(true)}
          disabled={privateOpen}
        >
          打开私密周期记录
        </ActionButton>
        <ActionButton variant="ghost" onClick={() => open('cycle')}>
          记录周期
        </ActionButton>
      </div>
      {privateOpen ? <PrivateCycle onClose={closePrivate} /> : null}
      <Modal
        open={!!mode}
        onOpenChange={(v) => {
          if (!v && !busy) setMode(null);
        }}
        title={mode ? title[mode] : '记录'}
      >
        {mode === 'cycle' ? (
          <p className="muted">仅在你打开私密区域时显示，不出现在 HOME。</p>
        ) : null}
        {mode ? (
          <FieldForm
            title={title[mode]}
            fields={fields()}
            busy={busy}
            error={error}
            onSave={(v) => void save(v)}
            onCancel={() => setMode(null)}
          />
        ) : null}
      </Modal>
      <Modal
        open={!!removing}
        onOpenChange={(v) => {
          if (!v && !busy) setRemoving(null);
        }}
        title="移除状态记录"
        description="该瞬间会从日常列表中移除。"
      >
        {error ? <p role="alert">{error}</p> : null}
        <ActionButton
          disabled={busy}
          onClick={async () => {
            if (!removing) return;
            setBusy(true);
            try {
              await apiClient['status-moments'].delete({
                ...removing,
                confirm: true,
              });
              setRemoving(null);
              await cache.invalidateQueries({ queryKey: ['status'] });
            } catch (e) {
              setError(errorText(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          确认移除
        </ActionButton>
      </Modal>
    </section>
  );
}
