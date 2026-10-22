import endpoint from '@/endpoint';
import isAuthorized from '@/middlewares/is-authorized';
import ownsRecord from '../middlewares/owns-record';
import { taskActionSchema, taskSchema } from '../contract';
import { reopenTask } from '../methods';

export default endpoint
  .use(isAuthorized)
  .route({ method: 'POST', path: '/tasks/{id}/reopen' })
  .input(taskActionSchema)
  .use(ownsRecord)
  .output(taskSchema)
  .handler(({ context, input }) => reopenTask(context.user.id, input));
