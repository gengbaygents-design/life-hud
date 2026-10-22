import endpoint from '@/endpoint';
import isAuthorized from '@/middlewares/is-authorized';
import { updateSchema, recordSchema } from '../contract';
import { updateLog } from '../methods';
export default endpoint
  .use(isAuthorized)
  .route({ method: 'PUT', path: '/captain-logs/{id}' })
  .input(updateSchema)
  .output(recordSchema)
  .handler(({ context, input }) => updateLog(context.user.id, input));
