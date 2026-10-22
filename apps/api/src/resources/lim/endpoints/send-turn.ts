import endpoint from '@/endpoint';
import isAuthorized from '@/middlewares/is-authorized';
import { turnInputSchema, turnOutputSchema } from '../contract';
import { sendTurn } from '../methods';
export default endpoint
  .use(isAuthorized)
  .route({ method: 'POST', path: '/lim/turns' })
  .input(turnInputSchema)
  .output(turnOutputSchema)
  .handler(({ context, input }) => sendTurn(context.user.id, input));
