import endpoint from '@/endpoint';
import isAuthorized from '@/middlewares/is-authorized';
import { querySchema } from '../contract';
import { historySchema } from '../history-contract';
import { getHistory } from '../history';
export default endpoint
  .use(isAuthorized)
  .route({ method: 'GET', path: '/archive-entries/history' })
  .input(querySchema)
  .output(historySchema)
  .handler(({ context, input }) => getHistory(context.user.id, input));
