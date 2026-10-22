import endpoint from '@/endpoint';
import isAuthorized from '@/middlewares/is-authorized';
import { z } from 'zod';
import { undoInputSchema } from '../contract';
import { undoGroup } from '../executor';
export default endpoint
  .use(isAuthorized)
  .route({ method: 'POST', path: '/lim/undo' })
  .input(undoInputSchema)
  .output(z.object({ reply: z.string() }))
  .handler(({ context, input }) =>
    undoGroup(context.user.id, input.groupId, input.undoToken),
  );
