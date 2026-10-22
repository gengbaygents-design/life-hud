import type { HomeViewModel } from './types';
export function isAttentionQuestion(text: string) {
  return /^(?:我现在(?:该)?(?:干嘛|做什么)|现在(?:该)?(?:干嘛|做什么)|what should i do now)[?？。!！.]*$/i.test(
    text.trim(),
  );
}
export function attentionReply(home: HomeViewModel): string {
  const primary = home.nextAction,
    fallback = home.fallbackAction;
  if (!primary) return home.emptyMessage ?? '此刻，可以留白。';
  const clock = (iso: string | null) =>
    iso
      ? new Intl.DateTimeFormat('zh-CN', {
          timeZone: home.timeZone,
          hour: '2-digit',
          minute: '2-digit',
          hourCycle: 'h23',
        }).format(new Date(iso))
      : '';
  let reply =
    primary.type === 'CLASS'
      ? primary.state === 'CURRENT'
        ? `你现在正在上${primary.title}，至${clock(primary.endsAt)}。`
        : `${clock(primary.plannedStart)}有${primary.title}。`
      : primary.suggestedAction === 'SUBMIT_ASSIGNMENT'
        ? `先核对${primary.title}的提交状态。`
        : `先做${primary.title}。`;
  if (primary.type !== 'CLASS' || primary.state !== 'CURRENT')
    reply += '\n' + primary.reason;
  if (fallback)
    reply +=
      '\n\n' +
      (primary.type === 'CLASS'
        ? primary.state === 'CURRENT'
          ? '下课后可看：'
          : '课前有余裕再看：'
        : '另一选择：') +
      fallback.title +
      (fallback.estimatedMinutes ? ` · ${fallback.estimatedMinutes}分钟` : '') +
      '。';
  return reply;
}
