import endpoint from '@/endpoint';
import isAuthorized from '@/middlewares/is-authorized';
import ownsRecord from '../middlewares/owns-record';
import { taskIdSchema, taskSchema } from '../contract';
import { getTask } from '../methods';

export default endpoint
  .use(isAuthorized)
  .route({ method: 'GET', path: '/tasks/{id}' })
  .input(taskIdSchema)
  .use(ownsRecord)
  .output(taskSchema)
  .handler(({ context, input }) => getTask(context.user.id, input));
