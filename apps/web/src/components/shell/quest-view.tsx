import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Clock3, Inbox, ListChecks, Plus } from 'lucide-react';
import { useApiQuery } from '@/hooks';
import { apiClient } from '@/services/api-client.service';
import { useCoreData, type TaskRecord } from '@/components/quest/use-core-data';
import TaskEditor, { type TaskDraft } from '@/components/quest/task-editor';
import TaskCard from '@/components/quest/task-card';
import { RememberButton } from '@/components/archive/remember-button';
import {
  LoadingState,
  ActionButton,
  EmptyState,
  GlassCard,
  Modal,
  SectionHeader,
} from './primitives';

type Command =
  | { kind: 'create'; draft: TaskDraft }
  | { kind: 'update'; task: TaskRecord; draft: TaskDraft }
  | { kind: 'delay'; task: TaskRecord; plannedStart: string }
  | {
      kind: 'start' | 'complete' | 'drop' | 'remove' | 'reopen';
      task: TaskRecord;
    };
const isClosed = (task: TaskRecord) =>
  task.status === 'COMPLETED' || task.status === 'DROPPED';
export function QuestView() {
  const { board, projects } = useCoreData();
  const cache = useQueryClient();
  const [editor, setEditor] = useState<TaskRecord | 'new' | null>(null),
    [delay, setDelay] = useState<TaskRecord | null>(null);
  const [confirmation, setConfirmation] = useState<{
    kind: 'drop' | 'remove';
    task: TaskRecord;
  } | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false),
    [candidateIndex, setCandidateIndex] = useState(0),
    [error, setError] = useState('');
  const selected = typeof editor === 'object' ? editor : null;
  const history = useApiQuery(
    apiClient.tasks.history,
    { id: selected?.id ?? '00000000-0000-4000-8000-000000000000' },
    { enabled: !!selected, retry: false },
  );
  const completed = useApiQuery(
    apiClient.tasks.list,
    { status: 'COMPLETED', limit: 50, offset: 0 },
    { enabled: historyOpen, retry: false },
  );
  const dropped = useApiQuery(
    apiClient.tasks.list,
    { status: 'DROPPED', limit: 50, offset: 0 },
    { enabled: historyOpen, retry: false },
  );
  const refresh = () => {
    void cache.invalidateQueries({ queryKey: ['tasks'] });
    void cache.invalidateQueries({ queryKey: ['home'] });
    void cache.invalidateQueries({ queryKey: ['study'] });
  };
  const mutation = useMutation({
    mutationFn: async (command: Command) => {
      if (command.kind === 'create')
        return apiClient.tasks.create(command.draft);
      const action = { id: command.task.id, version: command.task.version };
      switch (command.kind) {
        case 'update':
          return apiClient.tasks.update({ ...command.draft, ...action });
        case 'delay':
          return apiClient.tasks.delay({
            ...action,
            plannedStart: command.plannedStart,
          });
        case 'drop':
          return apiClient.tasks.drop({ ...action, confirm: true });
        case 'remove':
          return apiClient.tasks.remove({ ...action, confirm: true });
        case 'complete':
          return apiClient.tasks.complete(action);
        case 'start':
          return apiClient.tasks.start(action);
        case 'reopen':
          return apiClient.tasks.reopen(action);
      }
    },
    onSuccess: () => {
      refresh();
      setEditor(null);
      setDelay(null);
      setConfirmation(null);
      setError('');
    },
    onError: (failure: Error & { status?: number; code?: string }) => {
      if (failure.status === 409 || failure.code === 'CONFLICT') {
        setError(
          '记录已在其他位置更新。输入已保留，请关闭后重新打开最新记录。',
        );
        refresh();
      } else setError('操作未完成，请检查连接后重试。输入会保留在这里。');
    },
  });
  const run = (command: Command) => {
    setError('');
    mutation.mutate(command);
  };
  const open = (task: TaskRecord) => {
    setError('');
    setEditor(task);
  };
  const data = board.data,
    candidates = data?.now ?? [],
    candidate = candidates[candidateIndex % candidates.length];
  const card = (task: TaskRecord) => (
    <TaskCard
      key={task.id}
      task={task}
      busy={mutation.isPending}
      onOpen={open}
      onStart={
        !isClosed(task) && task.status !== 'ACTIVE'
          ? (item) => run({ kind: 'start', task: item })
          : undefined
      }
      onComplete={
        !isClosed(task)
          ? (item) => run({ kind: 'complete', task: item })
          : undefined
      }
    />
  );
  return (
    <section className="hud-page">
      <div className="page-intro quest-intro">
        <SectionHeader
          eyebrow="LIFE HUD"
          title="QUEST"
          description="把要做的事，放到看得见的地方。"
        />
        <ActionButton
          onClick={() => {
            setError('');
            setEditor('new');
          }}
        >
          <Plus size={16} aria-hidden="true" />
          记录一件事
        </ActionButton>
      </div>
      {board.isPending && <LoadingState label="正在读取任务…" />}
      {board.isError && (
        <p role="alert">
          任务暂时无法读取。
          <ActionButton variant="ghost" onClick={() => void board.refetch()}>
            重试
          </ActionButton>
        </p>
      )}
      {error && !editor && !delay && !confirmation && (
        <p role="alert">{error}</p>
      )}
      <div className="quest-grid">
        <GlassCard className="quest-column" aria-label="NOW">
          <h2 className="card-kicker">
            <ListChecks size={14} aria-hidden="true" />
            NOW · 此刻
          </h2>
          {candidate ? (
            <>
              <p className="muted">{candidate.reason}</p>
              {card(candidate.task)}
              {candidates.length > 1 && (
                <ActionButton
                  variant="ghost"
                  onClick={() => setCandidateIndex((index) => index + 1)}
                >
                  换一个
                </ActionButton>
              )}
            </>
          ) : (
            !board.isPending &&
            !board.isError && (
              <EmptyState
                title="今天没有必须处理的事。"
                description="可以安静停留，按自己的节奏前行。"
              />
            )
          )}
        </GlassCard>
        <GlassCard className="quest-column" aria-label="TODAY">
          <h2 className="card-kicker">
            <Clock3 size={14} aria-hidden="true" />
            TODAY · 今天
          </h2>
          {data?.today.map(card)}
          {!board.isPending && !board.isError && !data?.today.length && (
            <EmptyState
              title="今天暂未安排任务"
              description="计划、截止或正在进行的任务会出现在这里。"
            />
          )}
        </GlassCard>
        <GlassCard className="quest-column" aria-label="INBOX">
          <h2 className="card-kicker">
            <Inbox size={14} aria-hidden="true" />
            INBOX · 收件箱
          </h2>
          {data?.inbox.map(card)}
          {!board.isPending && !board.isError && !data?.inbox.length && (
            <EmptyState
              title="收件箱安静"
              description="想记下一件事时，只写标题也可以。"
            />
          )}
        </GlassCard>
      </div>
      <details
        className="quest-history"
        onToggle={(event) => setHistoryOpen(event.currentTarget.open)}
      >
        <summary>最近完成与放下</summary>
        {historyOpen && (
          <div className="quest-history-list">
            {completed.isPending || dropped.isPending ? (
              <LoadingState label="正在读取历史…" />
            ) : completed.isError || dropped.isError ? (
              <p role="alert">历史暂时无法读取。</p>
            ) : (
              <>
                {[...(completed.data ?? []), ...(dropped.data ?? [])]
                  .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
                  .map(card)}
                {!completed.data?.length && !dropped.data?.length && (
                  <p className="muted">还没有已完成或放下的任务。</p>
                )}
              </>
            )}
          </div>
        )}
      </details>
      <Modal
        open={editor !== null}
        onOpenChange={(value) => {
          if (!value && !mutation.isPending) setEditor(null);
        }}
        title={editor === 'new' ? '记录一件事' : (selected?.title ?? '任务')}
        description="计划与截止分别保存，你不必一次安排完整。"
      >
        {editor === 'new' || (selected && !isClosed(selected)) ? (
          <TaskEditor
            key={selected?.id ?? 'new'}
            initial={selected ?? undefined}
            projects={projects.data ?? []}
            busy={mutation.isPending}
            error={error}
            onSave={(draft) =>
              run(
                selected
                  ? { kind: 'update', task: selected, draft }
                  : { kind: 'create', draft },
              )
            }
            onCancel={() => setEditor(null)}
          />
        ) : (
          selected && (
            <>
              <p className="muted">
                {selected.status === 'COMPLETED'
                  ? '已完成于 ' +
                    new Date(selected.completedAt!).toLocaleString('zh-CN')
                  : '这件事已经放下。'}
              </p>
              <ActionButton
                variant="outline"
                disabled={mutation.isPending}
                onClick={() => run({ kind: 'reopen', task: selected })}
              >
                重新打开
              </ActionButton>
            </>
          )
        )}
        {selected && (
          <>
            <RememberButton source={{ type: 'TASK', id: selected.id }} />
            <div className="task-dialog-actions">
              {!isClosed(selected) && (
                <>
                  <ActionButton
                    variant="ghost"
                    disabled={mutation.isPending}
                    onClick={() => {
                      setError('');
                      setDelay(selected);
                    }}
                  >
                    延期 / 重排
                  </ActionButton>
                  <ActionButton
                    variant="ghost"
                    disabled={mutation.isPending}
                    onClick={() => {
                      setError('');
                      setConfirmation({ kind: 'drop', task: selected });
                    }}
                  >
                    放下任务
                  </ActionButton>
                </>
              )}
              <ActionButton
                variant="ghost"
                disabled={mutation.isPending}
                onClick={() => {
                  setError('');
                  setConfirmation({ kind: 'remove', task: selected });
                }}
              >
                删除任务
              </ActionButton>
            </div>
            <details>
              <summary>变更历史</summary>
              {history.isPending ? (
                <LoadingState label="正在读取变更…" />
              ) : history.isError ? (
                <p role="alert">变更历史暂时无法读取。</p>
              ) : (
                <ol className="task-audit">
                  {history.data?.map((item) => (
                    <li key={item.id}>
                      <span>{actionLabel(item.action)}</span>
                      <time dateTime={item.createdAt}>
                        {new Date(item.createdAt).toLocaleString('zh-CN')}
                      </time>
                    </li>
                  ))}
                </ol>
              )}
            </details>
            {isClosed(selected) && error && <p role="alert">{error}</p>}
          </>
        )}
      </Modal>
      <Modal
        open={!!delay}
        onOpenChange={(value) => {
          if (!value && !mutation.isPending) setDelay(null);
        }}
        title="调整计划"
        description="这里只调整计划，原截止时间保持不变。"
      >
        {delay && (
          <form
            className="task-form"
            onSubmit={(event) => {
              event.preventDefault();
              const value = String(
                new FormData(event.currentTarget).get('plannedStart'),
              );
              run({
                kind: 'delay',
                task: delay,
                plannedStart: new Date(value).toISOString(),
              });
            }}
          >
            <label className="form-field">
              新的计划开始
              <input
                type="datetime-local"
                name="plannedStart"
                required
                disabled={mutation.isPending}
              />
            </label>
            <p>
              原截止时间：
              {delay.dueAt
                ? new Date(delay.dueAt).toLocaleString('zh-CN')
                : '未设置'}
            </p>
            {error && <p role="alert">{error}</p>}
            <ActionButton type="submit" disabled={mutation.isPending}>
              保存新计划
            </ActionButton>
          </form>
        )}
      </Modal>
      <Modal
        open={!!confirmation}
        onOpenChange={(value) => {
          if (!value && !mutation.isPending) setConfirmation(null);
        }}
        title={
          confirmation?.kind === 'drop' ? '放下这件事？' : '删除这条任务？'
        }
        description={
          confirmation?.kind === 'drop'
            ? '记录会保留在历史中，也可以重新打开。'
            : '任务将不再出现在普通列表，变更历史仍保留。'
        }
      >
        {error && <p role="alert">{error}</p>}
        <ActionButton
          disabled={mutation.isPending}
          onClick={() => confirmation && run(confirmation)}
        >
          确认{confirmation?.kind === 'drop' ? '放下' : '删除'}
        </ActionButton>
      </Modal>
    </section>
  );
}
function actionLabel(action: string) {
  return (
    (
      {
        TaskCreated: '创建任务',
        TaskUpdated: '更新任务',
        TaskStarted: '开始任务',
        TaskCompleted: '完成任务',
        TaskDelayed: '调整计划',
        TaskDropped: '放下任务',
        TaskReopened: '重新打开',
        TaskDeleted: '删除任务',
      } as Record<string, string>
    )[action] ?? action
  );
}
