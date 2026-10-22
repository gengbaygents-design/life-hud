import { ORPCError } from '@orpc/server';
function invalid(message: string): never {
  throw new ORPCError('BAD_REQUEST', { message });
}
export const evidenceForState: Record<string, string> = {
  UNDERSTANDING: 'UNDERSTANDING',
  PRACTICING: 'PRACTICE',
  INDEPENDENT: 'INDEPENDENT',
  TRANSFER: 'TRANSFER',
  PROVEN: 'OUTPUT',
};
export function assertReflectionAuthor(
  origin: 'USER' | 'GENERATED',
  data: Record<string, unknown>,
) {
  if (
    origin === 'GENERATED' &&
    ['reflection', 'questions', 'applications', 'projectIdeas'].some(
      (k) => data[k] !== undefined,
    )
  )
    invalid('生成内容不能写入用户反思字段。');
}
export function validateMoment(data: Record<string, unknown>) {
  if (
    !['mood', 'energy', 'stress', 'focus'].some((k) => data[k] != null) &&
    !data.bodyStateJson &&
    !(typeof data.note === 'string' && data.note.trim())
  )
    invalid('记录一项状态即可。');
  if (
    data.mood === 'OTHER' &&
    !(typeof data.customMood === 'string' && data.customMood.trim())
  )
    invalid('请写下自定义感受。');
  if (data.customMood && data.mood !== 'OTHER')
    invalid('自定义感受须选择“更多”。');
}
export function validateEvidenceClaim(
  type: string,
  note: unknown,
  confirmed: boolean,
  source: { reflection?: unknown; applications?: unknown } | null,
) {
  if (type === 'CONTACT') return;
  if (!confirmed || typeof note !== 'string' || !note.trim())
    invalid('请明确确认，并写下这条证据说明了什么。');
  if (
    source &&
    !String(source.reflection ?? '').trim() &&
    !String(source.applications ?? '').trim()
  )
    invalid('仅保存来源只能作为接触证据。');
  if (
    type === 'UNDERSTANDING' &&
    source &&
    !String(source.reflection ?? '').trim()
  )
    invalid('理解证据需要你自己的解释。');
  if (
    type === 'TRANSFER' &&
    source &&
    !String(source.applications ?? '').trim()
  )
    invalid('迁移证据需要实际应用记录。');
}
