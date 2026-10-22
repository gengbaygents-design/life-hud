import type { Domain, Mode } from './types';
export function normalizeInput(content: string) {
  return content.normalize('NFKC').trim();
}
export function detectMode(text: string): Mode {
  if(/(?:不要|别|不用|无需|不必|不想让你)(?:再)?(?:提醒|记住|记下|保存)/.test(text))return 'TALK';
  if(/提醒|记住这一刻|把这一刻记下来|存.*(?:Captain|日志)|记.*(?:Captain|日志)|remind|save.*log|remember.*moment/i.test(text))return 'EXECUTE';
  if (
    /不想|不愿|好烦|累了|有点累/.test(text) &&
    !/记一下|记录|记下来|挪到|改到|推迟|安排/.test(text)
  )
    return 'TALK';
  if (
    /记一下|记录|记下来|提醒|新建|创建|添加|挪到|改到|推迟|安排|做完|完成了|我交了|提交了|交过了|周[一二三四五六日天].*交|(?:今晚|今天|明天|下午|晚上|点).*做|(?:今晚|今天|明天|下午|晚上).*写|create |complete |delay |record /i.test(
      text,
    )
  )
    return 'EXECUTE';
  if (
    /[?？]|现在干嘛|什么要紧|没处理|课表|日程|帮我|怎么办|what|schedule/i.test(
      text,
    )
  )
    return 'ASSIST';
  return 'TALK';
}
export function selectDomains(
  text: string,
  mode: Mode,
  sourceType?: string,
): Domain[] {
  if (mode === 'TALK') return ['UI'];
  const domains: Domain[] = ['UI', 'VOYAGE'];
  if (/记录|记一下/.test(text) && /精力|累|情绪|压力|专注/.test(text))
    return [...domains, 'STATUS'];
  if (
    /想法|学习记录|过拟合|反思/.test(text) ||
    sourceType === 'LEARNING_RECORD' ||
    (requestedRecord(text) && /来源|链接/.test(text))
  )
    return [
      ...domains,
      'GROWTH',
      ...(sourceType === 'COURSE' ? ['STUDY' as const] : []),
    ];
  return [
    ...domains,
    'QUEST',
    'STUDY',
    ...(/现在干嘛|状态/.test(text) ? ['STATUS' as const] : []),
  ];
}
export function invalidClock(text: string) {
  return (
    /(?:二十五|二十四|二十六|二十七|二十八|二十九|三十)点/.test(text) ||
    /(?:^|\D)(?:2[4-9]|[3-9]\d)(?:[:：点时])/.test(text)
  );
}
export function requestedRecord(text: string) {
  return /记一下|记录|记下来|record /i.test(text);
}
