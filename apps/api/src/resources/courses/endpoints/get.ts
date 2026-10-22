import endpoint from '@/endpoint';
import isAuthorized from '@/middlewares/is-authorized';
import { recordSchema } from '../contract';
import { idSchema } from '../../core-contract';
import { getRecord } from '../methods';

export default endpoint
  .use(isAuthorized)
  .route({ method: 'GET', path: '/courses/{id}' })
  .input(idSchema)
  .output(recordSchema)
  .handler(({ context, input }) => getRecord(context.user.id, input));
