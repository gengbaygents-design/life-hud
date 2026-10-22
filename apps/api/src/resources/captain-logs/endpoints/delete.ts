import endpoint from '@/endpoint';
import isAuthorized from '@/middlewares/is-authorized';
import { confirmSchema, idSchema } from '../../core-contract';
import { removeLog } from '../methods';
export default endpoint
  .use(isAuthorized)
  .route({ method: 'DELETE', path: '/captain-logs/{id}' })
  .input(confirmSchema.strict())
  .output(idSchema)
  .handler(({ context, input }) => removeLog(context.user.id, input));
