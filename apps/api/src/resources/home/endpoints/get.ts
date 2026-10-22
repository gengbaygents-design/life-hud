import endpoint from '@/endpoint';
import isAuthorized from '@/middlewares/is-authorized';
import { inputSchema, recordSchema } from '../contract';
import { getHome } from '../methods';
export default endpoint
  .use(isAuthorized)
  .route({ method: 'GET', path: '/home' })
  .input(inputSchema)
  .output(recordSchema)
  .handler(({ context, input }) => getHome(context.user.id, input));
