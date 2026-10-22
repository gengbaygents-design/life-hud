import endpoint from '@/endpoint';
import isAuthorized from '@/middlewares/is-authorized';
import { createSchema, recordSchema } from '../contract';
import { createEntry } from '../methods';
export default endpoint
  .use(isAuthorized)
  .route({ method: 'POST', path: '/archive-entries' })
  .input(createSchema)
  .output(recordSchema)
  .handler(({ context, input }) => createEntry(context.user.id, input));
