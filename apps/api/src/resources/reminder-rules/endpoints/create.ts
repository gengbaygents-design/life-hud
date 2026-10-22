import endpoint from '@/endpoint';
import isAuthorized from '@/middlewares/is-authorized';
import { createSchema, recordSchema } from '../contract';
import { createReminder } from '../methods';
export default endpoint
  .use(isAuthorized)
  .route({ method: 'POST', path: '/reminder-rules' })
  .input(createSchema)
  .output(recordSchema)
  .handler(({ context, input }) => createReminder(context.user.id, input));
