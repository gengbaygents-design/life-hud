import type { ReactNode } from 'react';
import { GlassCard, StatusChip } from '@/components/shell/primitives';
import { useLim } from '@/components/shell/lim-state';

export const moodLabels: Record<string, string> = {
  HAPPY: '开心',
  CALM: '平静',
  TIRED: '疲惫',
  ANXIOUS: '焦虑',
  SAD: '难过',
  OTHER: '更多',
};

const privacyLabels: Record<string, string> = {
  PRIVATE: '私密',
  NORMAL: '普通',
  HIGH_PRIVATE: '高隐私',
  VAULT: '保密',
};

const skillStates: Record<
  string,
  { label: string; tone: 'quiet' | 'success' | 'warning' }
> = {
  EXPOSED: { label: '接触中', tone: 'quiet' },
  UNDERSTANDING: { label: '理解中', tone: 'quiet' },
  PRACTICING: { label: '实践中', tone: 'warning' },
  INDEPENDENT: { label: '独立使用', tone: 'success' },
  TRANSFER: { label: '迁移中', tone: 'warning' },
  PROVEN: { label: '已有证明', tone: 'success' },
};

function formatRecordedAt(iso: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso));
}

export interface Moment {
  id: string;
  recordedAt: string;
  mood: string | null;
  customMood: string | null;
  energy: number | null;
  stress: number | null;
  focus: number | null;
  note: string | null;
  privacyLevel: string;
}

export interface MomentCardProps {
  moment: Moment;
  children?: ReactNode;
}

export function MomentCard({ moment, children }: MomentCardProps) {
  const { openLim } = useLim();
  const moodLabel =
    moment.customMood ??
    (moment.mood === null ? null : (moodLabels[moment.mood] ?? moment.mood));
  const privacyLabel =
    privacyLabels[moment.privacyLevel] ?? moment.privacyLevel;
  return (
    <article data-testid={`moment-${moment.id}`}>
      <button
        type="button"
        className="text-link"
        onClick={() =>
          openLim({
            sourceEntity: {
              type: 'STATUS_MOMENT',
              id: moment.id,
              label: '当前状态记录',
            },
          })
        }
      >
        和 Lim 看看
      </button>
      <GlassCard className="personal-moment flex flex-col gap-3">
        <header className="flex flex-wrap items-center justify-between gap-2">
          <time dateTime={moment.recordedAt} className="text-sm opacity-80">
            {formatRecordedAt(moment.recordedAt)}
          </time>
          <StatusChip tone="quiet">{privacyLabel}</StatusChip>
        </header>
        {moodLabel !== null && (
          <p className="text-base font-medium break-words">{moodLabel}</p>
        )}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {moment.energy !== null && <span>精力 {moment.energy}/5</span>}
          {moment.stress !== null && <span>压力 {moment.stress}/5</span>}
          {moment.focus !== null && <span>专注 {moment.focus}/5</span>}
        </div>
        {moment.note !== null && (
          <p className="text-sm whitespace-pre-wrap break-words">
            {moment.note}
          </p>
        )}
        {children}
      </GlassCard>
    </article>
  );
}

export interface Skill {
  id: string;
  name: string;
  state: string;
  description: string | null;
}

export interface SkillCardProps {
  skill: Skill;
  evidenceCount: number;
  onOpen: () => void;
}

export function SkillCard({ skill, evidenceCount, onOpen }: SkillCardProps) {
  const state = skillStates[skill.state] ?? {
    label: skill.state,
    tone: 'quiet' as const,
  };
  return (
    <button type="button" onClick={onOpen} className="w-full text-left">
      <GlassCard className="personal-skill flex flex-col gap-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h3 className="text-base font-medium break-words">{skill.name}</h3>
          <StatusChip tone={state.tone}>{state.label}</StatusChip>
        </div>
        {skill.description !== null && (
          <p className="text-sm whitespace-pre-wrap break-words">
            {skill.description}
          </p>
        )}
        <p className="text-sm opacity-80">{evidenceCount} 条证据</p>
      </GlassCard>
    </button>
  );
}
