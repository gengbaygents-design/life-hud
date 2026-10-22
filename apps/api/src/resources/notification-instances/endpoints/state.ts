import endpoint from '@/endpoint';
import isAuthorized from '@/middlewares/is-authorized';
import { stateSchema, recordSchema } from '../contract';
import { setNotificationState } from '../methods';
export default endpoint
  .use(isAuthorized)
  .route({ method: 'POST', path: '/notification-instances/{id}/state' })
  .input(stateSchema)
  .output(recordSchema)
  .handler(({ context, input }) =>
    setNotificationState(context.user.id, input),
  );
