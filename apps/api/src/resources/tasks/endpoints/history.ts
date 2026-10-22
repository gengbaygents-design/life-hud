import endpoint from '@/endpoint';
import isAuthorized from '@/middlewares/is-authorized';
import ownsRecord from '../middlewares/owns-record';
import { taskIdSchema } from '../contract';
import { auditSchema } from '@/resources/audit-logs/contract';
import { getTaskHistory } from '../methods';

export default endpoint
  .use(isAuthorized)
  .route({ method: 'GET', path: '/tasks/{id}/history' })
  .input(taskIdSchema)
  .use(ownsRecord)
  .output(auditSchema.array())
  .handler(({ context, input }) => getTaskHistory(context.user.id, input));
