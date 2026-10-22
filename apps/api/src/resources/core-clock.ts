export function selectClockNow(
  env: { APP_ENV?: string; DEV_NOW?: string },
  realNow: Date = new Date(),
): Date {
  if (env.APP_ENV !== 'development') return realNow;
  const raw = env.DEV_NOW;
  if (raw === undefined) return realNow;
  const dev = new Date(raw);
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(
      raw,
    ) ||
    Number.isNaN(dev.getTime())
  ) {
    throw new Error('Invalid development clock');
  }
  return dev;
}
