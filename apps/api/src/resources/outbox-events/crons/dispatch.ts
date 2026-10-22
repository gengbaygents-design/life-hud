import scheduler from '@/scheduler';
import '../../assignments/handlers/task-completed';
import { dispatchPendingEvents } from '../methods';
export default scheduler({
  cron: '*/15 * * * * *',
  handler: () => dispatchPendingEvents(),
});
