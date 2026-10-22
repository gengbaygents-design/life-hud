import { z } from 'zod';
import endpoint from '@/endpoint';
import isAuthorized from '@/middlewares/is-authorized';
import { listSchema, recordSchema } from '../contract';
import { listReminders } from '../methods';
export default endpoint
  .use(isAuthorized)
  .route({ method: 'GET', path: '/reminder-rules' })
  .input(listSchema)
  .output(z.array(recordSchema))
  .handler(({ context }) => listReminders(context.user.id));
