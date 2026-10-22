import endpoint from '@/endpoint';
import isAuthorized from '@/middlewares/is-authorized';
import { emptySchema } from '../../core-contract';
import { recordSchema } from '../contract';
import { getStudy } from '../methods';
export default endpoint
  .use(isAuthorized)
  .route({ method: 'GET', path: '/study' })
  .input(emptySchema)
  .output(recordSchema)
  .handler(({ context }) => getStudy(context.user.id));
