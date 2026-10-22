import endpoint from '@/endpoint';
import isAuthorized from '@/middlewares/is-authorized';
import ownsRecord from '../middlewares/owns-record';
import { taskCompleteSchema, taskSchema } from '../contract';
import { completeTask } from '../methods';

export default endpoint
  .use(isAuthorized)
  .route({ method: 'POST', path: '/tasks/{id}/complete' })
  .input(taskCompleteSchema)
  .use(ownsRecord)
  .output(taskSchema)
  .handler(({ context, input }) => completeTask(context.user.id, input));
