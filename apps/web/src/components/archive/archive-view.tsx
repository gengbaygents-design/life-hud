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
import { HistoryCard } from './history-card';
import { RememberButton } from './remember-button';
import './foundation.css';
const api = apiClient['archive-entries'],
  logs = apiClient['captain-logs'];
type Log = Awaited<ReturnType<typeof logs.get>>;
type Item = Awaited<ReturnType<typeof api.history>>['items'][number];
type Ref = { type: Item['sourceType']; id: string };
export function ArchiveView({ searchMode = false }: { searchMode?: boolean }) {
  const timeZone =
      Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Shanghai',
    cache = useQueryClient();
  const [tab, setTab] = useState('recent'),
    [day, setDay] = useState(''),
    [keyword, setKeyword] = useState(''),
    [q, setQ] = useState(''),
    [voyageId, setVoyage] = useState(''),
    [semesterId, setSemester] = useState(''),
    [sensitive, setSensitive] = useState(false);
  const history = useApiQuery(
    api.history,
    {
      timeZone,
      q,
      day: day || undefined,
      voyageId: voyageId || undefined,
      semesterId: semesterId || undefined,
      includeSensitive: sensitive,
    },
    { retry: false, placeholderData: undefined },
  );
  const [editing, setEditing] = useState<Log | 'new' | null>(null),
    [body, setBody] = useState(''),
    [privacy, setPrivacy] = useState<'PRIVATE' | 'HIGH_PRIVATE' | 'VAULT'>(
      'PRIVATE',
    ),
    [aiPolicy, setAiPolicy] = useState<Log['aiAccessPolicy']>('EXPLICIT_ONLY'),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const [source, setSource] = useState<{
    ref: Ref;
    title: string;
    body: string;
    privacy: 'PRIVATE' | 'HIGH_PRIVATE' | 'VAULT';
  } | null>(null);
  const refresh = () =>
    cache.invalidateQueries({ queryKey: ['archive-entries'] });
  async function openSource(type: string, id: string) {
    setError('');
    setBusy(true);
    try {
      if (type === 'CAPTAIN_LOG') {
        const row = await logs.get({ id });
        setEditing(row);
        setBody(row.body);
        setPrivacy(row.privacyLevel);
        setAiPolicy(row.aiAccessPolicy);
        return;
      }
      const row =
        type === 'TASK'
          ? await apiClient.tasks.get({ id })
          : type === 'ASSIGNMENT'
            ? await apiClient.assignments.get({ id })
            : type === 'LEARNING_RECORD'
              ? await apiClient['learning-records'].get({ id })
              : type === 'STATUS_MOMENT'
                ? await apiClient['status-moments'].get({ id })
                : type === 'COURSE'
                  ? await apiClient.courses.get({ id })
                  : type === 'PROJECT'
                    ? await apiClient.projects.get({ id })
                    : type === 'VOYAGE'
                      ? await apiClient.voyages.get({ id })
                      : type === 'CLASS_SESSION'
                        ? await apiClient['class-sessions'].get({ id })
                        : type === 'EXAM'
                          ? await apiClient.exams.get({ id })
                          : null;
      if (!row) throw new Error('Unavailable');
      const data = row as Record<string, unknown>;
      setSource({
        ref: { type: type as Ref['type'], id },
        title: String(
          data.title ??
            data.name ??
            (type === 'STATUS_MOMENT' ? '状态记录' : '课程时段'),
        ),
        body: String(
          data.description ??
            data.reflection ??
            data.note ??
            (type === 'CLASS_SESSION'
              ? `${data.specificDate} ${data.startTime}–${data.endTime}`
              : '这条记录保留在原来的领域中。'),
        ),
        privacy: ['HIGH_PRIVATE', 'VAULT'].includes(String(data.privacyLevel))
          ? (data.privacyLevel as 'HIGH_PRIVATE' | 'VAULT')
          : 'PRIVATE',
      });
    } catch {
      setError('原记录已移除或暂时无法读取。');
      void refresh();
    } finally {
      setBusy(false);
    }
  }
  async function saveLog() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      if (editing === 'new') {
        await logs.create({
          body,
          privacyLevel: privacy,
          aiAccessPolicy: aiPolicy,
          voyageId: voyageId || null,
        });
      } else if (editing) {
        const unchanged =
          body === editing.body ||
          body === editing.body.replace(/\r\n?/g, '\n');
        await logs.update({
          id: editing.id,
          version: editing.version,
          ...(!unchanged ? { body } : {}),
          privacyLevel: privacy,
          aiAccessPolicy: aiPolicy,
        });
      }
      setEditing(null);
      await refresh();
    } catch {
      setError('未能保存。请检查内容，或刷新后重试。');
    } finally {
      setBusy(false);
    }
  }
  const visible =
    history.data?.items.filter((item) =>
      tab === 'logs'
        ? item.sourceType === 'CAPTAIN_LOG'
        : tab === 'moments'
          ? item.sourceType === 'ARCHIVE_ENTRY'
          : true,
    ) ?? [];
  return (
    <section className="hud-page phase7-page">
      <Link to="/app/more">返回 MORE</Link>
      <SectionHeader
        eyebrow="LIFE HUD / MEMORY"
        title={searchMode ? 'SEARCH' : 'ARCHIVE'}
        description="回望走过的片段。原记录，仍在原来的地方。"
      />
      <div className="phase7-row">
        <ActionButton
          onClick={() => {
            setEditing('new');
            setBody('');
            setPrivacy('PRIVATE');
            setAiPolicy('EXPLICIT_ONLY');
            setError('');
          }}
        >
          写 Captain’s Log
        </ActionButton>
        <RememberButton />
      </div>
      <div className="phase7-tabs" role="group" aria-label="档案视图">
        {[
          ['recent', '最近'],
          ['timeline', '时间线'],
          ['logs', 'Captain’s Log'],
          ['moments', '重要时刻'],
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
      <form
        className="phase7-controls"
        onSubmit={(e) => {
          e.preventDefault();
          setQ(keyword);
        }}
      >
        <label>
          寻找过去
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="LIFE HUD、过拟合、高数…"
            maxLength={100}
          />
        </label>
        <ActionButton type="submit">查找</ActionButton>
        <label>
          日期
          <input
            type="date"
            value={day}
            onChange={(e) => setDay(e.target.value)}
          />
        </label>
        <details className="phase7-advanced">
          <summary>航程与隐私筛选</summary>
          <div className="phase7-row">
            <label>
              航程
              <select
                value={voyageId}
                onChange={(e) => {
                  setVoyage(e.target.value);
                  setSemester('');
                }}
              >
                <option value="">LIFE · 全部航程</option>
                {history.data?.voyages.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.title}
                    {v.status === 'ACTIVE' ? '' : ' · 历史'}
                  </option>
                ))}
              </select>
            </label>
            <label>
              学期
              <select
                value={semesterId}
                onChange={(e) => setSemester(e.target.value)}
              >
                <option value="">全部学期</option>
                {history.data?.semesters
                  .filter((s) => !voyageId || s.voyageId === voyageId)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title}
                    </option>
                  ))}
              </select>
            </label>
            <label className="phase7-check">
              <input
                type="checkbox"
                checked={sensitive}
                onChange={(e) => setSensitive(e.target.checked)}
              />
              本次查看高隐私记录（仅自己可见）
            </label>
          </div>
        </details>
      </form>
      {(error || history.isError) && (
        <p role="alert">
          {error || '暂时无法读取档案。'}
          <ActionButton variant="ghost" onClick={() => void history.refetch()}>
            重试
          </ActionButton>
        </p>
      )}
      {history.isPending && <LoadingState label="正在回望…" />}
      <div className="phase7-list">
        {visible.map((item) => (
          <div key={item.sourceType + item.sourceId}>
            <HistoryCard
              item={item}
              timeZone={timeZone}
              onOpen={(type, id) => void openSource(type, id)}
            />
            {item.sourceType === 'ARCHIVE_ENTRY' && (
              <ActionButton
                variant="ghost"
                disabled={busy}
                onClick={() => {
                  if (!window.confirm('移除这个档案标记？原记录会保留。'))
                    return;
                  setBusy(true);
                  void api
                    .delete({
                      id: item.sourceId,
                      version: item.version,
                      confirm: true,
                    })
                    .then(refresh)
                    .catch(() => setError('未能移除，请刷新后重试。'))
                    .finally(() => setBusy(false));
                }}
              >
                移除标记
              </ActionButton>
            )}
          </div>
        ))}
        {!history.isPending && !history.isError && !visible.length && (
          <EmptyState
            title="这一页，可以留白"
            description="还没有匹配的片段。"
          />
        )}
      </div>
      <Modal
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        title="Captain’s Log"
        description="文字本身就足够。不必总结，也不必变成任务。"
      >
        <form
          className="phase7-form"
          onSubmit={(e) => {
            e.preventDefault();
            void saveLog();
          }}
        >
          <label>
            日志原文
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={30000}
              required
              rows={9}
            />
          </label>
          <label>
            日志隐私
            <select
              value={privacy}
              onChange={(e) => setPrivacy(e.target.value as typeof privacy)}
            >
              <option value="PRIVATE">私密</option>
              <option value="HIGH_PRIVATE">高隐私</option>
              <option value="VAULT">保险库</option>
            </select>
          </label>
          <label>
            AI 访问
            <select
              value={aiPolicy}
              onChange={(e) => setAiPolicy(e.target.value as typeof aiPolicy)}
            >
              <option value="EXPLICIT_ONLY">仅明确授权时</option>
              <option value="NEVER">从不提供给 AI</option>
              <option value="WHEN_RELEVANT">相关时允许</option>
              <option value="ALWAYS">允许使用</option>
            </select>
          </label>
          {error && <p role="alert">{error}</p>}
          <ActionButton type="submit" disabled={busy || !body.trim()}>
            保存原文
          </ActionButton>
        </form>
        {editing && editing !== 'new' && (
          <div className="phase7-source-actions">
            <RememberButton
              source={{ type: 'CAPTAIN_LOG', id: editing.id }}
              privacyLevel={privacy}
            />
            <ActionButton
              variant="ghost"
              disabled={busy}
              onClick={() => {
                if (!window.confirm('移除这篇日志？')) return;
                setBusy(true);
                void logs
                  .delete({
                    id: editing.id,
                    version: editing.version,
                    confirm: true,
                  })
                  .then(async () => {
                    setEditing(null);
                    await refresh();
                  })
                  .catch(() => setError('未能移除，请刷新后重试。'))
                  .finally(() => setBusy(false));
              }}
            >
              移除日志
            </ActionButton>
          </div>
        )}
      </Modal>
      <Modal
        open={source !== null}
        onOpenChange={(open) => {
          if (!open) setSource(null);
        }}
        title={source?.title ?? '原记录'}
        description="来自原领域的当前记录。"
      >
        {source && (
          <>
            <p className="phase7-prose">{source.body}</p>
            <RememberButton
              source={{
                type: source.ref.type as Exclude<Ref['type'], 'ARCHIVE_ENTRY'>,
                id: source.ref.id,
              }}
              privacyLevel={source.privacy}
            />
          </>
        )}
      </Modal>
    </section>
  );
}
