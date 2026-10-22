import endpoint from '@/endpoint';
import isAuthorized from '@/middlewares/is-authorized';
import ownsRecord from '../middlewares/owns-record';
import { taskDelaySchema, taskSchema } from '../contract';
import { delayTask } from '../methods';

export default endpoint
  .use(isAuthorized)
  .route({ method: 'POST', path: '/tasks/{id}/delay' })
  .input(taskDelaySchema)
  .use(ownsRecord)
  .output(taskSchema)
  .handler(({ context, input }) => delayTask(context.user.id, input));
