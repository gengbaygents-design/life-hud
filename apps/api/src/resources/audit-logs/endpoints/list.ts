import endpoint from '@/endpoint';
import isAuthorized from '@/middlewares/is-authorized';
import { listSchema, auditSchema } from '../contract';
import { listRecords } from '../methods';

export default endpoint
  .use(isAuthorized)
  .route({ method: 'GET', path: '/audit-logs' })
  .input(listSchema)
  .output(auditSchema.array())
  .handler(({ context, input }) => listRecords(context.user.id, input));
