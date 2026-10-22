import endpoint from '@/endpoint';
import isAuthorized from '@/middlewares/is-authorized';
import { createSchema, recordSchema } from '../contract';
import { createLog } from '../methods';
export default endpoint
  .use(isAuthorized)
  .route({ method: 'POST', path: '/captain-logs' })
  .input(createSchema)
  .output(recordSchema)
  .handler(({ context, input }) => createLog(context.user.id, input));
