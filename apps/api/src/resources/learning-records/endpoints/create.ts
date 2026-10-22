import endpoint from '@/endpoint';
import isAuthorized from '@/middlewares/is-authorized';
import { linkedCreateSchema as createSchema, recordSchema } from '../contract';
import { createRecord } from '../methods';
export default endpoint
  .use(isAuthorized)
  .route({ method: 'POST', path: '/learning-records' })
  .input(createSchema)
  .output(recordSchema)
  .handler(({ context, input }) => createRecord(context.user.id, input));
