import endpoint from '@/endpoint';
import isAuthorized from '@/middlewares/is-authorized';
import ownsRecord from '../middlewares/owns-record';
import { taskUpdateSchema, taskSchema } from '../contract';
import { updateTask } from '../methods';

export default endpoint
  .use(isAuthorized)
  .route({ method: 'PUT', path: '/tasks/{id}' })
  .input(taskUpdateSchema)
  .use(ownsRecord)
  .output(taskSchema)
  .handler(({ context, input }) => updateTask(context.user.id, input));
