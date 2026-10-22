import endpoint from '@/endpoint';
import isAuthorized from '@/middlewares/is-authorized';
import { turnIdSchema, turnOutputSchema } from '../contract';
import { getTurn } from '../methods';
export default endpoint
  .use(isAuthorized)
  .route({ method: 'GET', path: '/lim/turns/{id}' })
  .input(turnIdSchema)
  .output(turnOutputSchema)
  .handler(({ context, input }) => getTurn(context.user.id, input));
