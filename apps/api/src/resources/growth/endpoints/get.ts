import endpoint from '@/endpoint';
import isAuthorized from '@/middlewares/is-authorized';
import { emptySchema } from '../../core-contract';
import { recordSchema } from '../contract';
import { getGrowth } from '../methods';
export default endpoint
  .use(isAuthorized)
  .route({ method: 'GET', path: '/growth' })
  .input(emptySchema)
  .output(recordSchema)
  .handler(({ context }) => getGrowth(context.user.id));
