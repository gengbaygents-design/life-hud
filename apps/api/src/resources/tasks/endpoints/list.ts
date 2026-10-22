import endpoint from '@/endpoint';
import isAuthorized from '@/middlewares/is-authorized';
import { taskListSchema, taskSchema } from '../contract';
import { listTasks } from '../methods';

export default endpoint
  .use(isAuthorized)
  .route({ method: 'GET', path: '/tasks' })
  .input(taskListSchema)
  .output(taskSchema.array())
  .handler(({ context, input }) => listTasks(context.user.id, input));
