import endpoint from '@/endpoint';
import isAuthorized from '@/middlewares/is-authorized';
import { listSchema, eventSchema } from '../contract';
import { listRecords } from '../methods';

export default endpoint
  .use(isAuthorized)
  .route({ method: 'GET', path: '/outbox-events' })
  .input(listSchema)
  .output(eventSchema.array())
  .handler(({ context, input }) => listRecords(context.user.id, input));
