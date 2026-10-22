import endpoint from '@/endpoint';
import isAuthorized from '@/middlewares/is-authorized';
import { cancelSchema, recordSchema } from '../contract';
import { cancelReminder } from '../methods';
export default endpoint
  .use(isAuthorized)
  .route({ method: 'POST', path: '/reminder-rules/{id}/cancel' })
  .input(cancelSchema)
  .output(recordSchema)
  .handler(({ context, input }) => cancelReminder(context.user.id, input));
