import { GlassCard, ActionButton } from '@/components/shell/primitives';

const LABELS: Record<string, string> = {
  TASK: '完成任务',
  ASSIGNMENT: '作业',
  CLASS_SESSION: '课程',
  STATUS_MOMENT: '状态',
  LEARNING_RECORD: '学习记录',
  CAPTAIN_LOG: '航海日志',
  ARCHIVE_ENTRY: '重要时刻',
};
const labelOf = (t: string) => LABELS[t] ?? t;

export interface HistoryItem {
  sourceType: string;
  sourceId: string;
  title: string;
  at: string;
  excerpt: string | null;
  privacyLevel: string;
  links: {
    sourceType: string;
    sourceId: string;
    title: string;
    available: boolean;
  }[];
}
export interface HistoryCardProps {
  item: HistoryItem;
  timeZone: string;
  onOpen: (type: string, id: string) => void;
}

export function HistoryCard({ item, timeZone, onOpen }: HistoryCardProps) {
  const when = new Intl.DateTimeFormat('zh-CN', {
    timeZone,
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(item.at));
  return (
    <GlassCard
      className="history-card"
      data-testid={`history-${item.sourceId}`}
    >
      <header>
        <span>{labelOf(item.sourceType)}</span>
        <span>
          {item.privacyLevel === 'HIGH_PRIVATE'
            ? '高隐私'
            : item.privacyLevel === 'VAULT'
              ? '保险库'
              : '私密'}
        </span>
        <time dateTime={item.at}>{when}</time>
      </header>
      <h3>{item.title}</h3>
      {item.excerpt && <p style={{ whiteSpace: 'pre-wrap' }}>{item.excerpt}</p>}
      {item.sourceType !== 'ARCHIVE_ENTRY' && (
        <ActionButton
          variant="ghost"
          onClick={() => onOpen(item.sourceType, item.sourceId)}
        >
          查看原记录
        </ActionButton>
      )}
      {item.links.length > 0 && (
        <ul>
          {item.links.map((l) =>
            l.available ? (
              <li key={`${l.sourceType}-${l.sourceId}`}>
                <ActionButton
                  variant="ghost"
                  onClick={() => onOpen(l.sourceType, l.sourceId)}
                >
                  {l.title}
                </ActionButton>
              </li>
            ) : (
              <li key={`${l.sourceType}-${l.sourceId}`}>{l.title}（已删除）</li>
            ),
          )}
        </ul>
      )}
    </GlassCard>
  );
}
