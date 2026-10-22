import endpoint from '@/endpoint';
import isAuthorized from '@/middlewares/is-authorized';
import { inputSchema, recordSchema } from '../contract';
import { getStatus } from '../methods';
export default endpoint
  .use(isAuthorized)
  .route({ method: 'GET', path: '/status' })
  .input(inputSchema)
  .output(recordSchema)
  .handler(({ context, input }) => getStatus(context.user.id, input));
