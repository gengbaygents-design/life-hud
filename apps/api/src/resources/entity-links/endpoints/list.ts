import endpoint from '@/endpoint';
import isAuthorized from '@/middlewares/is-authorized';
import { listSchema, recordSchema } from '../contract';
import { listRecords } from '../methods';

export default endpoint
  .use(isAuthorized)
  .route({ method: 'GET', path: '/entity-links' })
  .input(listSchema)
  .output(recordSchema.array())
  .handler(({ context, input }) => listRecords(context.user.id, input));
