import endpoint from '@/endpoint';
import isAuthorized from '@/middlewares/is-authorized';
import ownsRecord from '../middlewares/owns-record';
import { taskConfirmSchema, taskSchema } from '../contract';
import { removeTask } from '../methods';

export default endpoint
  .use(isAuthorized)
  .route({ method: 'DELETE', path: '/tasks/{id}' })
  .input(taskConfirmSchema)
  .use(ownsRecord)
  .output(taskSchema)
  .handler(({ context, input }) => removeTask(context.user.id, input));
