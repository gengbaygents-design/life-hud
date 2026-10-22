import endpoint from '@/endpoint';
import isAuthorized from '@/middlewares/is-authorized';
import { updateSchema, recordSchema } from '../contract';
import { updateRecord } from '../methods';
export default endpoint
  .use(isAuthorized)
  .route({ method: 'PUT', path: '/exercise-records/{id}' })
  .input(updateSchema)
  .output(recordSchema)
  .handler(({ context, input }) => updateRecord(context.user.id, input));
