import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/services/api-client.service';
import { LoadingState, ActionButton } from '@/components/shell/primitives';
import { useLim } from '@/components/shell/lim-state';
import { ConversationCards } from './conversation-cards';
import './lim.css';
type Conversation = Awaited<ReturnType<typeof apiClient.lim.getConversation>>;
type Request = Parameters<typeof apiClient.lim.sendTurn>[0];
const allowedSources = [
  'TASK',
  'COURSE',
  'ASSIGNMENT',
  'LEARNING_RECORD',
  'STATUS_MOMENT',
] as const;
export function LimConversation() {
  const { state, setConversationId } = useLim(),
    cache = useQueryClient();
  const [data, setData] = useState<Conversation | null>(null),
    [list, setList] = useState<{ id: string; title: string }[]>([]),
    [draft, setDraft] = useState(''),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [share, setShare] = useState(false),
    [status, setStatus] = useState<{ available: boolean; kind: string } | null>(
      null,
    ),
    [unauthorized, setUnauthorized] = useState(false);
  const retry = useRef<Request | null>(null),
    inFlight = useRef(false),
    log = useRef<HTMLDivElement>(null);
  const id = state.conversationId;
  async function refresh(conversationId: string) {
    const next = await apiClient.lim.getConversation({ id: conversationId });
    setData(next);
    return next;
  }
  useEffect(() => {
    let live = true;
    setLoading(true);
    setError('');
    (async () => {
      try {
        const [provider, conversations] = await Promise.all([
          apiClient.lim.status(),
          apiClient.lim.listConversations(),
        ]);
        if (!live) return;
        setStatus(provider);
        setList(conversations);
        const selected = id ?? conversations[0]?.id;
        if (selected) {
          const conversation = await apiClient.lim.getConversation({
            id: selected,
          });
          if (live) {
            setData(conversation);
            if (!id) setConversationId(selected);
          }
        } else setData(null);
      } catch (e) {
        if (live) {
          setUnauthorized((e as { code?: string }).code === 'UNAUTHORIZED');
          setError('暂时无法读取对话，请稍后重新打开。');
        }
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => {
      live = false;
    };
    // Conversation selection is intentionally handled here; the provider lives above routes.
  }, [id]);
  const processing =
    data?.turns.some((t) => t.status === 'PROCESSING') ?? false;
  useEffect(() => {
    if (!processing || !id) return;
    const timer = setInterval(() => {
      void refresh(id).catch(() =>
        setError('连接中断，可重新打开对话查看结果。'),
      );
    }, 1500);
    return () => clearInterval(timer);
  }, [processing, id]);
  useEffect(() => {
    log.current?.scrollTo({
      top: log.current.scrollHeight,
      behavior: 'instant',
    });
  }, [data, busy]);
  async function submit(retryInput?: Request, localQuestion?: string) {
    const content = localQuestion ?? draft;
    if (
      inFlight.current ||
      busy ||
      processing ||
      (!retryInput && (!content.trim() || retry.current))
    )
      return;
    inFlight.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      let selected = id;
      if (!selected) {
        const conversation = await apiClient.lim.createConversation({});
        selected = conversation.id;
        setConversationId(selected);
      }
      const source =
        state.sourceEntity &&
        allowedSources.includes(
          state.sourceEntity.type as (typeof allowedSources)[number],
        )
          ? {
              type: state.sourceEntity.type as (typeof allowedSources)[number],
              id: state.sourceEntity.id,
            }
          : null;
      const input = retryInput ?? {
        conversationId: selected,
        requestId: crypto.randomUUID(),
        content,
        timeZone:
          Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Shanghai',
        sourceRoute: state.sourceRoute,
        sourceEntity: source,
        shareRefs: share && source ? [source] : [],
      };
      retry.current = input;
      await apiClient.lim.sendTurn(input);
      retry.current = null;
      setDraft('');
      setShare(false);
      await refresh(selected);
      await cache.invalidateQueries();
    } catch {
      setError('这次连接未完成。可使用原请求重试，或重新打开查看已保存结果。');
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  async function undo(groupId: string, undoToken: string) {
    if (!id || busy) return;
    setBusy(true);
    setError('');
    try {
      const result = await apiClient.lim.undo({ groupId, undoToken });
      setNotice(result.reply);
      await refresh(id);
      await cache.invalidateQueries();
    } catch {
      setError('未能撤销：记录可能已改变，或撤销已过期。请到原页面核对。');
    } finally {
      setBusy(false);
    }
  }
  if (unauthorized)
    return (
      <p className="muted">
        登录后可以与 Lim 对话。<a href="/sign-in">前往登录</a>
      </p>
    );
  return (
    <div className="lim-conversation">
      <div className="lim-conversation-tools">
        <label>
          对话
          <select
            aria-label="选择对话"
            value={id ?? ''}
            disabled={busy || processing}
            onChange={(e) => {
              retry.current = null;
              setData(null);
              setConversationId(e.target.value || null);
            }}
          >
            <option value="">最近对话</option>
            {list.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
            {id && !list.some((c) => c.id === id) && (
              <option value={id}>
                {data?.conversation.title ?? '当前对话'}
              </option>
            )}
          </select>
        </label>
        <ActionButton
          variant="ghost"
          disabled={busy || processing}
          onClick={() => {
            setBusy(true);
            void apiClient.lim
              .createConversation({})
              .then((c) => {
                retry.current = null;
                setData(null);
                setDraft('');
                setList((previous) => [c, ...previous]);
                setConversationId(c.id);
              })
              .catch(() => setError('暂时无法新建对话。'))
              .finally(() => setBusy(false));
          }}
        >
          新对话
        </ActionButton>
      </div>
      {status?.kind === 'development-mock' && (
        <p className="lim-provider-note">开发验收模式 · 固定模拟回复</p>
      )}
      {status && !status.available && (
        <p className="lim-provider-note">
          Lim 暂未连接 AI。仍可问“我现在干嘛？”查看本地建议。
        </p>
      )}
      {loading && <LoadingState label="正在读取对话…" />}
      <ActionButton
        variant="ghost"
        disabled={loading || busy || processing || Boolean(retry.current)}
        onClick={() => void submit(undefined, '我现在干嘛？')}
      >
        我现在干嘛？
      </ActionButton>
      <div className="lim-log-scroll" ref={log}>
        <ConversationCards
          messages={data?.messages ?? []}
          turns={data?.turns ?? []}
          onUndo={(g, t) => void undo(g, t)}
          busy={busy || processing}
        />
      </div>
      {notice && <p role="status">{notice}</p>}
      {error && <p role="alert">{error}</p>}
      {retry.current && error && (
        <ActionButton
          variant="outline"
          disabled={busy || processing}
          onClick={() => void submit(retry.current!)}
        >
          使用原请求重试
        </ActionButton>
      )}
      <form
        className="lim-composer"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        {state.sourceEntity &&
          ['LEARNING_RECORD', 'STATUS_MOMENT'].includes(
            state.sourceEntity.type,
          ) && (
            <label className="lim-share">
              <input
                type="checkbox"
                checked={share}
                onChange={(e) => setShare(e.target.checked)}
                disabled={busy || processing}
              />
              本次明确附上当前记录（高隐私内容仍不会发送）
            </label>
          )}
        <textarea
          aria-label="对 Lim 说"
          placeholder="说说此刻，或告诉我需要做什么。"
          maxLength={8000}
          rows={2}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={loading || busy || processing || Boolean(retry.current)}
        />
        <ActionButton
          type="submit"
          disabled={
            loading ||
            busy ||
            processing ||
            (!status?.available &&
              !/^(?:我现在(?:该)?(?:干嘛|做什么)|现在(?:该)?(?:干嘛|做什么)|what should i do now)[?？。!！.]*$/i.test(
                draft.trim(),
              )) ||
            !draft.trim() ||
            Boolean(retry.current)
          }
        >
          发送
        </ActionButton>
      </form>
    </div>
  );
}
