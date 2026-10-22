import endpoint from '@/endpoint';
import isAuthorized from '@/middlewares/is-authorized';
import { recordSchema } from '../contract';
import { emptySchema } from '../../core-contract';
import { listRecords } from '../methods';
import { z } from 'zod';

export default endpoint
  .use(isAuthorized)
  .route({ method: 'GET', path: '/grades' })
  .input(emptySchema)
  .output(z.array(recordSchema))
  .handler(({ context, input }) => listRecords(context.user.id, input));
