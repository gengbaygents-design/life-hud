type ConversationMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

type ConversationTurn = {
  id: string;
  reply: string;
  status: string;
  sourceMessageId: string | null;
  result: { undoToken: string | null } | null;
};

function receiptLabel(status: string, hasResult: boolean): string | null {
  if (status === 'PARTIAL') return '部分完成';
  if (status === 'FAILED') return '未完成';
  if (status === 'CLARIFICATION') return '需要补充';
  if (status === 'SUCCESS' && hasResult) return '已处理';
  return null;
}

export function ConversationCards({
  messages,
  turns,
  onUndo,
  busy,
}: {
  messages: ConversationMessage[];
  turns: ConversationTurn[];
  onUndo: (groupId: string, token: string) => void;
  busy: boolean;
}) {
  return (
    <div className="lim-messages" role="log" aria-live="polite">
      {messages.length === 0 && !busy ? (
        <p className="lim-empty">
          我在这里。
          <br />
          等你开口，也可以安静停留。
        </p>
      ) : null}
      {messages.map((message, index) => {
        const turn =
          message.role === 'assistant'
            ? turns.find(
                (item) => item.sourceMessageId === messages[index - 1]?.id,
              )
            : undefined;
        const receipt = turn
          ? receiptLabel(turn.status, turn.result !== null)
          : null;
        const undoToken = turn?.result?.undoToken ?? null;
        return (
          <article
            key={message.id}
            className="lim-message"
            data-role={message.role}
          >
            <small>{message.role === 'user' ? '你' : 'Lim'}</small>
            <p>{message.content}</p>
            {receipt ? <small className="lim-receipt">{receipt}</small> : null}
            {turn && undoToken ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => onUndo(turn.id, undoToken)}
              >
                撤销可撤销操作
              </button>
            ) : null}
          </article>
        );
      })}
      {busy ? <p className="lim-busy">正在处理…</p> : null}
    </div>
  );
}
