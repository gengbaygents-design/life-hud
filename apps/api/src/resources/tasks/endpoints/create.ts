import endpoint from '@/endpoint';
import isAuthorized from '@/middlewares/is-authorized';
import { taskCreateSchema, taskSchema } from '../contract';
import { createTask } from '../methods';

export default endpoint
  .use(isAuthorized)
  .route({ method: 'POST', path: '/tasks' })
  .input(taskCreateSchema)
  .output(taskSchema)
  .handler(({ context, input }) => createTask(context.user.id, input));
