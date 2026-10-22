import endpoint from '@/endpoint';
import isAuthorized from '@/middlewares/is-authorized';
import { emptySchema } from '@/resources/core-contract';
import { recordSchema } from '../contract';
import { listRecords } from '../methods';

export default endpoint
  .use(isAuthorized)
  .route({ method: 'GET', path: '/projects' })
  .input(emptySchema)
  .output(recordSchema.array())
  .handler(({ context, input }) => listRecords(context.user.id, input));
