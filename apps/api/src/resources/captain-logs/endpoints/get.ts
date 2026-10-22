import endpoint from '@/endpoint';
import isAuthorized from '@/middlewares/is-authorized';
import { recordSchema } from '../contract';
import { idSchema } from '../../core-contract';
import { getLog } from '../methods';
export default endpoint
  .use(isAuthorized)
  .route({ method: 'GET', path: '/captain-logs/{id}' })
  .input(idSchema.strict())
  .output(recordSchema)
  .handler(({ context, input }) => getLog(context.user.id, input));
