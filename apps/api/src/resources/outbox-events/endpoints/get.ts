import endpoint from '@/endpoint';
import isAuthorized from '@/middlewares/is-authorized';
import { idSchema } from '@/resources/core-contract';
import { eventSchema } from '../contract';
import { getRecord } from '../methods';

export default endpoint
  .use(isAuthorized)
  .route({ method: 'GET', path: '/outbox-events/{id}' })
  .input(idSchema)
  .output(eventSchema)
  .handler(({ context, input }) => getRecord(context.user.id, input));
