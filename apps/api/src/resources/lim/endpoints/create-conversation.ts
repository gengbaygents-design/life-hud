import endpoint from '@/endpoint';
import isAuthorized from '@/middlewares/is-authorized';
import { createConversationSchema, conversationSchema } from '../contract';
import { createConversation } from '../methods';
export default endpoint
  .use(isAuthorized)
  .route({ method: 'POST', path: '/lim/conversations' })
  .input(createConversationSchema)
  .output(conversationSchema)
  .handler(({ context }) => createConversation(context.user.id));
