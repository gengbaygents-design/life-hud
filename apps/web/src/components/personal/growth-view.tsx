import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useLim } from '@/components/shell/lim-state';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/services/api-client.service';
import {
  LoadingState,
  GlassCard,
  HUDCard,
  SectionHeader,
  ActionButton,
  EmptyState,
  Modal,
  StatusChip,
} from '@/components/shell/primitives';
import FieldForm, { type Field } from '@/components/study/field-form';
import LearningForm from './learning-form';
import { SkillCard } from './cards';
import {
  useGrowth,
  errorText,
  evidenceLabels,
  skillLabels,
  type GrowthData,
} from './use-personal';
import './personal.css';
type Mode =
  | 'learning'
  | 'skill'
  | 'detail'
  | 'state'
  | 'evidence'
  | 'mistake'
  | 'project';
type Learning = GrowthData['records'][number];
type Skill = GrowthData['skills'][number];
const authoredText = (value: string, initial?: string | null) =>
  typeof initial === 'string' && value === initial.replace(/\r\n?/g, '\n')
    ? initial
    : value === ''
      ? null
      : value;
const field = (
  name: string,
  label: string,
  type = 'text',
  required = false,
  value?: string,
): Field => ({ name, label, type, required, value });
export function GrowthView() {
  const { openLim } = useLim();
  const query = useGrowth(),
    data = query.data,
    cache = useQueryClient();
  const [mode, setMode] = useState<Mode | null>(null),
    [editing, setEditing] = useState<Learning | null>(null),
    [selected, setSelected] = useState<Skill | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const currentSkill =
    data?.skills.find((s) => s.id === selected?.id) ?? selected;
  const open = (m: Mode) => {
    setError('');
    setMode(m);
  };
  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError('');
    try {
      await action();
      setMode(null);
      setEditing(null);
      await Promise.all([
        cache.invalidateQueries({ queryKey: ['growth'] }),
        cache.invalidateQueries({ queryKey: ['entity-links'] }),
        cache.invalidateQueries({ queryKey: ['projects'] }),
        cache.invalidateQueries({ queryKey: ['home'] }),
      ]);
    } catch (e) {
      setError(errorText(e));
      await cache.invalidateQueries({ queryKey: ['growth'] });
    } finally {
      setBusy(false);
    }
  };
  const saveLearning = (v: Record<string, string>) =>
    run(() => {
      const input = {
        title: v.title,
        sourceKind: v.sourceKind
          ? (v.sourceKind as
              | 'TEXT'
              | 'URL'
              | 'IMAGE'
              | 'FILE'
              | 'COURSE'
              | 'ASSIGNMENT'
              | 'OTHER')
          : null,
        sourceRef: v.sourceRef || null,
        reflection: authoredText(v.reflection, editing?.reflection),
        applications: authoredText(v.applications, editing?.applications),
      };
      return editing
        ? apiClient['learning-records'].update({
            ...input,
            id: editing.id,
            version: editing.version,
          })
        : apiClient['learning-records'].create({
            ...input,
            projectId: v.projectId || null,
            privacyLevel: (v.privacyLevel || 'PRIVATE') as
              | 'NORMAL'
              | 'PRIVATE'
              | 'HIGH_PRIVATE',
          });
    });
  const sourceOptions = [
    { value: '', label: '无' },
    ...(data?.sources.map((s) => ({
      value: s.type + ':' + s.id,
      label: s.label,
    })) ?? []),
  ];
  const fields = (): Field[] => {
    switch (mode) {
      case 'skill':
        return [
          field('name', '技能名称', 'text', true),
          field('description', '说明', 'textarea'),
        ];
      case 'state':
        return [
          {
            name: 'state',
            label: '根据证据确认状态',
            value: currentSkill?.state,
            options: Object.entries(skillLabels).map(([value, label]) => ({
              value,
              label,
            })),
          },
        ];
      case 'evidence':
        return [
          {
            name: 'evidenceType',
            label: '证据类型',
            options: Object.entries(evidenceLabels).map(([value, label]) => ({
              value,
              label,
            })),
          },
          {
            name: 'source',
            label: '来源记录',
            required: true,
            options: sourceOptions,
          },
          field('note', '证据说明', 'textarea'),
        ];
      case 'mistake':
        return [
          field('title', '混淆点标题', 'text', true),
          { name: 'source', label: '来源记录', options: sourceOptions },
          field('mistakeDescription', '我混淆了什么', 'textarea', true),
          field('correctUnderstanding', '更正后的理解', 'textarea'),
        ];
      case 'project':
        return [
          field('title', '项目名称', 'text', true, 'LIFE HUD · Project #001'),
          field('description', '说明', 'textarea'),
        ];
      default:
        return [];
    }
  };
  const save = (v: Record<string, string>) =>
    run(async () => {
      const [type, id] = (v.source || '').split(':');
      switch (mode) {
        case 'skill':
          return apiClient.skills.create({
            name: v.name,
            description: v.description || null,
          });
        case 'state':
          if (!currentSkill) return;
          return apiClient.skills.update({
            id: currentSkill.id,
            version: currentSkill.version,
            state: v.state as Skill['state'],
            confirmState: true,
          });
        case 'evidence':
          if (!currentSkill) return;
          return apiClient['skill-evidence'].create({
            skillId: currentSkill.id,
            evidenceType:
              v.evidenceType as GrowthData['evidence'][number]['evidenceType'],
            sourceType: type as GrowthData['evidence'][number]['sourceType'],
            sourceId: id,
            note: v.note || null,
            confirmEvidence: true,
          });
        case 'mistake':
          return apiClient['learning-mistakes'].create({
            title: v.title,
            sourceType: type
              ? (type as GrowthData['evidence'][number]['sourceType'])
              : null,
            sourceId: id || null,
            mistakeDescription: v.mistakeDescription,
            correctUnderstanding: v.correctUnderstanding || null,
          });
        case 'project': {
          const voyages = await apiClient.voyages.list({});
          return apiClient.projects.create({
            title: v.title,
            description: v.description || null,
            voyageId: voyages.find((x) => x.status === 'ACTIVE')?.id ?? null,
          });
        }
      }
    });
  const title =
    mode === 'learning'
      ? editing
        ? '编辑学习记录'
        : '记录学习'
      : mode === 'skill'
        ? '添加技能'
        : mode === 'state'
          ? '确认技能状态'
          : mode === 'evidence'
            ? '添加证据'
            : mode === 'mistake'
              ? '记录混淆点'
              : mode === 'project'
                ? '记录项目'
                : (currentSkill?.name ?? '技能证据');
  return (
    <section className="hud-page personal-workspace">
      <Link to="/app/more" className="text-link">
        返回 MORE
      </Link>
      <div className="page-intro">
        <SectionHeader
          eyebrow="LIFE HUD"
          title="GROWTH"
          description="把接触、理解与实践，各自留下证据。"
        />
        <ActionButton
          onClick={() => {
            setEditing(null);
            open('learning');
          }}
        >
          ＋记录
        </ActionButton>
      </div>
      {query.isPending ? <LoadingState label="正在读取学习记录…" /> : null}
      {query.isError ? (
        <p role="alert">
          学习记录暂时无法读取。
          <ActionButton onClick={() => query.refetch()}>重试</ActionButton>
        </p>
      ) : null}
      <div className="personal-grid">
        <HUDCard>
          <h2 className="card-heading">学习记录</h2>
          <div className="personal-stack">
            {data?.records.map((r) => (
              <article
                key={r.id}
                className="personal-evidence"
                data-testid={'learning-' + r.id}
              >
                <h3>{r.title}</h3>
                <ActionButton
                  variant="ghost"
                  onClick={() =>
                    openLim({
                      sourceEntity: {
                        type: 'LEARNING_RECORD',
                        id: r.id,
                        label: r.title,
                      },
                    })
                  }
                >
                  和 Lim 看看
                </ActionButton>
                {r.sourceRef ? (
                  <p className="muted">
                    来源 ·{' '}
                    {data.sources.find((s) => s.id === r.sourceRef)?.label ??
                      r.sourceRef}
                  </p>
                ) : null}
                {r.reflection === null ? (
                  <StatusChip>
                    {r.sourceRef ? '仅保存来源' : '仅记录标题'}
                  </StatusChip>
                ) : (
                  <p className="personal-prose" data-testid="user-reflection">
                    {r.reflection}
                  </p>
                )}
                {r.applications ? (
                  <p className="personal-prose">应用 · {r.applications}</p>
                ) : null}
                {data.links
                  .filter((l) => l.fromId === r.id)
                  .map((l) => (
                    <p key={l.id} className="muted">
                      应用于 ·{' '}
                      {data.projects.find((p) => p.id === l.toId)?.title ??
                        '项目已移除'}
                    </p>
                  ))}
                <ActionButton
                  variant="ghost"
                  onClick={() => {
                    setEditing(r);
                    open('learning');
                  }}
                >
                  编辑记录
                </ActionButton>
              </article>
            ))}
          </div>
          {data?.records.length === 0 ? (
            <EmptyState
              title="还没有学习记录"
              description="可以只保存来源，把想法留到愿意写的时候。"
            />
          ) : null}
        </HUDCard>
        <div className="personal-stack">
          <GlassCard>
            <h2 className="card-heading">技能</h2>
            <div className="personal-stack">
              {data?.skills.map((s) => (
                <SkillCard
                  key={s.id}
                  skill={s}
                  evidenceCount={
                    data.evidence.filter((e) => e.skillId === s.id).length
                  }
                  onOpen={() => {
                    setSelected(s);
                    open('detail');
                  }}
                />
              ))}
            </div>
            {data?.skills.length === 0 ? (
              <p className="muted">状态由你根据证据确认。</p>
            ) : null}
            <ActionButton
              variant="ghost"
              onClick={() => {
                setSelected(null);
                open('skill');
              }}
            >
              添加技能
            </ActionButton>
          </GlassCard>
          <GlassCard>
            <h2 className="card-heading">项目</h2>
            {data?.projects.map((p) => (
              <article key={p.id}>
                <h3>{p.title}</h3>
                {p.description ? (
                  <p className="muted">{p.description}</p>
                ) : null}
                <Link className="text-link" to="/app/quest">
                  去 QUEST 安排行动
                </Link>
              </article>
            ))}
            {!data?.projects.length ? (
              <p className="muted">这里呈现你已有的项目。</p>
            ) : null}
            <ActionButton variant="ghost" onClick={() => open('project')}>
              记录项目
            </ActionButton>
          </GlassCard>
        </div>
      </div>
      <details className="personal-secondary">
        <summary>混淆点与目标</summary>
        <GlassCard>
          <h2 className="card-heading">学习混淆点</h2>
          {data?.mistakes.map((m) => (
            <article key={m.id}>
              <h3>{m.title}</h3>
              <p className="personal-prose">{m.mistakeDescription}</p>
              {m.correctUnderstanding ? (
                <p className="personal-prose">{m.correctUnderstanding}</p>
              ) : null}
              <p className="muted">
                {data.sources.find((s) => s.id === m.sourceId)?.label ?? ''}
              </p>
            </article>
          ))}
          <ActionButton variant="ghost" onClick={() => open('mistake')}>
            记录混淆点
          </ActionButton>
          <h2 className="card-heading">目标</h2>
          {data?.goals.map((g) => (
            <p key={g.id}>{g.title}</p>
          ))}
          {!data?.goals.length ? <p className="muted">尚未记录目标。</p> : null}
        </GlassCard>
      </details>
      <Modal
        open={!!mode}
        onOpenChange={(v) => {
          if (!v && !busy) {
            setMode(null);
            setEditing(null);
          }
        }}
        title={title}
        description={
          mode === 'state'
            ? '选择你根据已有证据确认的状态，保存即明确确认。'
            : mode === 'evidence'
              ? '保存一条你确认的事实；证据不会自动升级技能。'
              : title
        }
      >
        {mode === 'learning' ? (
          <LearningForm
            key={editing?.id ?? 'new'}
            initial={editing ?? undefined}
            sources={data?.sources ?? []}
            projects={data?.projects ?? []}
            busy={busy}
            error={error}
            onSave={(v) => void saveLearning(v)}
            onCancel={() => {
              setMode(null);
              setEditing(null);
            }}
          />
        ) : mode === 'detail' ? (
          <div>
            {currentSkill ? (
              <StatusChip>{skillLabels[currentSkill.state]}</StatusChip>
            ) : null}
            {data?.evidence
              .filter((e) => e.skillId === currentSkill?.id)
              .map((e) => (
                <article
                  key={e.id}
                  className="personal-evidence"
                  data-testid={'evidence-' + e.id}
                >
                  <h3>{evidenceLabels[e.evidenceType]}</h3>
                  <p>
                    {data.sources.find(
                      (s) => s.id === e.sourceId && s.type === e.sourceType,
                    )?.label ?? '来源已移除'}
                  </p>
                  {e.note ? <p className="personal-prose">{e.note}</p> : null}
                  <time className="muted">
                    {new Date(e.observedAt).toLocaleString('zh-CN')}
                  </time>
                </article>
              ))}
            {!data?.evidence.some((e) => e.skillId === currentSkill?.id) ? (
              <p className="muted">还没有关联证据。</p>
            ) : null}
            <div className="personal-actions">
              <ActionButton onClick={() => open('evidence')}>
                添加证据
              </ActionButton>
              <ActionButton variant="ghost" onClick={() => open('state')}>
                确认技能状态
              </ActionButton>
            </div>
          </div>
        ) : mode ? (
          <FieldForm
            key={mode}
            title={title}
            fields={fields()}
            busy={busy}
            error={error}
            onSave={(v) => void save(v)}
            onCancel={() => setMode(null)}
          />
        ) : null}
      </Modal>
    </section>
  );
}
