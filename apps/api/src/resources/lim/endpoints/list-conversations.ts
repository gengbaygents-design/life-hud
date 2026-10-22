import endpoint from '@/endpoint';
import isAuthorized from '@/middlewares/is-authorized';
import { z } from 'zod';
import { conversationSchema } from '../contract';
import { listConversations } from '../methods';
export default endpoint
  .use(isAuthorized)
  .route({ method: 'GET', path: '/lim/conversations' })
  .output(z.array(conversationSchema))
  .handler(({ context }) => listConversations(context.user.id));
