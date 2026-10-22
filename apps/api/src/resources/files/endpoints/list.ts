import endpoint from '@/endpoint';
import isAuthorized from '@/middlewares/is-authorized';
import { z } from 'zod';
import { emptySchema } from '../../core-contract';
import { recordSchema } from '../contract';
import { listRecords } from '../methods';
export default endpoint
  .use(isAuthorized)
  .route({ method: 'GET', path: '/files' })
  .input(emptySchema)
  .output(z.array(recordSchema))
  .handler(({ context }) => listRecords(context.user.id));
