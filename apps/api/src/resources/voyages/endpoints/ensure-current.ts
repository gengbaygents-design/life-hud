import endpoint from '@/endpoint';
import isAuthorized from '@/middlewares/is-authorized';
import { emptySchema } from '@/resources/core-contract';
import { recordSchema } from '../contract';
import { ensureCurrent } from '../methods';

export default endpoint
  .use(isAuthorized)
  .route({ method: 'POST', path: '/voyages/ensure-current' })
  .input(emptySchema)
  .output(recordSchema)
  .handler(({ context, input }) => ensureCurrent(context.user.id, input));
