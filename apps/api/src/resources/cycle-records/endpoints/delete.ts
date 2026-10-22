import endpoint from '@/endpoint';
import isAuthorized from '@/middlewares/is-authorized';
import { recordSchema } from '../contract';
import { confirmSchema } from '../../core-contract';
import { removeRecord } from '../methods';
export default endpoint
  .use(isAuthorized)
  .route({ method: 'DELETE', path: '/cycle-records/{id}' })
  .input(confirmSchema)
  .output(recordSchema)
  .handler(({ context, input }) => removeRecord(context.user.id, input));
