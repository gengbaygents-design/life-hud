import endpoint from '@/endpoint';
import isAuthorized from '@/middlewares/is-authorized';
import { recordSchema } from '../contract';
import { emptySchema } from '../../core-contract';
import { z } from 'zod';
import { listRecords } from '../methods';
export default endpoint
  .use(isAuthorized)
  .route({ method: 'GET', path: '/status-moments' })
  .input(emptySchema)
  .output(z.array(recordSchema))
  .handler(({ context, input }) => listRecords(context.user.id, input));
