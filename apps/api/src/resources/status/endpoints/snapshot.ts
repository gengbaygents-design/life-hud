import endpoint from '@/endpoint';
import isAuthorized from '@/middlewares/is-authorized';
import { emptySchema } from '../../core-contract';
import { snapshotSchema } from '../contract';
import { getSnapshot } from '../methods';
export default endpoint
  .use(isAuthorized)
  .route({ method: 'GET', path: '/status/snapshot' })
  .input(emptySchema)
  .output(snapshotSchema)
  .handler(({ context }) => getSnapshot(context.user.id));
