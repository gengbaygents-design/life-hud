import endpoint from '@/endpoint';
import isAuthorized from '@/middlewares/is-authorized';
import ownsRecord from '../middlewares/owns-record';
import { taskActionSchema, taskSchema } from '../contract';
import { startTask } from '../methods';

export default endpoint
  .use(isAuthorized)
  .route({ method: 'POST', path: '/tasks/{id}/start' })
  .input(taskActionSchema)
  .use(ownsRecord)
  .output(taskSchema)
  .handler(({ context, input }) => startTask(context.user.id, input));
