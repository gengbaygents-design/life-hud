export function canUseAi(
  record: { privacyLevel: string; aiPolicy: string },
  explicit: boolean,
  relevant: boolean,
) {
  if (
    ['HIGH_PRIVATE', 'VAULT'].includes(record.privacyLevel) ||
    record.aiPolicy === 'NEVER'
  )
    return false;
  return (
    record.aiPolicy === 'ALWAYS' ||
    (record.aiPolicy === 'WHEN_RELEVANT' && relevant) ||
    (record.aiPolicy === 'EXPLICIT_ONLY' && explicit)
  );
}
