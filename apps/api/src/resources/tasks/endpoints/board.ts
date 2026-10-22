import endpoint from '@/endpoint';
import isAuthorized from '@/middlewares/is-authorized';
import { boardInputSchema, boardSchema } from '../contract';
import { getTaskBoard } from '../methods';

export default endpoint
  .use(isAuthorized)
  .route({ method: 'GET', path: '/tasks/board' })
  .input(boardInputSchema)
  .output(boardSchema)
  .handler(({ context, input }) => getTaskBoard(context.user.id, input));
