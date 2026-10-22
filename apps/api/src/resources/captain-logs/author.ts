export function canCreateLog(body: string, history: string[], request: string) {
  if (/(?:不要|别|不用|无需|不必)(?:再)?(?:记|存|保存)/.test(request))
    return false;
  if (!/存.*(?:Captain|日志)|记.*(?:Captain|日志)|save.*log/i.test(request))
    return false;
  return history.some(
    (s) =>
      s === body ||
      (/(?:Captain.?s Log|日志)[：:]/i.test(s) &&
        s.slice(s.search(/[：:]/) + 1) === body),
  );
}
