import endpoint from '@/endpoint';
import isAuthorized from '@/middlewares/is-authorized';
import { removeSchema } from '../contract';
import { idSchema } from '../../core-contract';
import { removeEntry } from '../methods';
export default endpoint
  .use(isAuthorized)
  .route({ method: 'DELETE', path: '/archive-entries/{id}' })
  .input(removeSchema)
  .output(idSchema)
  .handler(({ context, input }) => removeEntry(context.user.id, input));
