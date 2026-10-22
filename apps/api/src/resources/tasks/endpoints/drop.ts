import endpoint from '@/endpoint';
import isAuthorized from '@/middlewares/is-authorized';
import ownsRecord from '../middlewares/owns-record';
import { taskConfirmSchema, taskSchema } from '../contract';
import { dropTask } from '../methods';

export default endpoint
  .use(isAuthorized)
  .route({ method: 'POST', path: '/tasks/{id}/drop' })
  .input(taskConfirmSchema)
  .use(ownsRecord)
  .output(taskSchema)
  .handler(({ context, input }) => dropTask(context.user.id, input));
