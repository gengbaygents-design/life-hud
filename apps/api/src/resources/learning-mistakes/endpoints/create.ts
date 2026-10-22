import endpoint from '@/endpoint';
import isAuthorized from '@/middlewares/is-authorized';
import { createSchema, recordSchema } from '../contract';
import { createRecord } from '../methods';
export default endpoint
  .use(isAuthorized)
  .route({ method: 'POST', path: '/learning-mistakes' })
  .input(createSchema)
  .output(recordSchema)
  .handler(({ context, input }) => createRecord(context.user.id, input));
