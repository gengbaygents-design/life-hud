import scheduler from '@/scheduler';
import { reconcileReminders } from '../methods';
import { selectClockNow } from '../../core-clock';
export default scheduler({
  cron: '*/15 * * * * *',
  runOnStart: true,
  handler: () =>
    reconcileReminders(
      selectClockNow(process.env),
      process.env.APP_ENV === 'development'
        ? process.env.DEV_REMINDER_OWNER
        : undefined,
    ),
});
