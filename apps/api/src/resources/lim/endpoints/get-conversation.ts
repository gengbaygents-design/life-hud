import endpoint from '@/endpoint';
import isAuthorized from '@/middlewares/is-authorized';
import { turnIdSchema, conversationOutputSchema } from '../contract';
import { getConversation } from '../methods';
export default endpoint
  .use(isAuthorized)
  .route({ method: 'GET', path: '/lim/conversations/{id}' })
  .input(turnIdSchema)
  .output(conversationOutputSchema)
  .handler(({ context, input }) => getConversation(context.user.id, input));
