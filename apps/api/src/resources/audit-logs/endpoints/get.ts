import endpoint from '@/endpoint';
import isAuthorized from '@/middlewares/is-authorized';
import { idSchema } from '@/resources/core-contract';
import { auditSchema } from '../contract';
import { getRecord } from '../methods';

export default endpoint
  .use(isAuthorized)
  .route({ method: 'GET', path: '/audit-logs/{id}' })
  .input(idSchema)
  .output(auditSchema)
  .handler(({ context, input }) => getRecord(context.user.id, input));
