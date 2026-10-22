import { z } from 'zod';
import endpoint from '@/endpoint';
import isAuthorized from '@/middlewares/is-authorized';
import { listSchema, recordSchema } from '../contract';
import { listNotifications } from '../methods';
export default endpoint
  .use(isAuthorized)
  .route({ method: 'GET', path: '/notification-instances' })
  .input(listSchema)
  .output(z.array(recordSchema))
  .handler(({ context }) => listNotifications(context.user.id));
