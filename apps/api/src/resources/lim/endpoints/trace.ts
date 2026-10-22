import endpoint from '@/endpoint';
import isAuthorized from '@/middlewares/is-authorized';
import { z } from 'zod';
import { turnIdSchema } from '../contract';
import { getTrace } from '../methods';
export default endpoint
  .use(isAuthorized)
  .route({ method: 'GET', path: '/lim/turns/{id}/trace' })
  .input(turnIdSchema)
  .output(z.unknown())
  .handler(({ context, input }) => getTrace(context.user.id, input));
