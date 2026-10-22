import endpoint from '@/endpoint';
import isAuthorized from '@/middlewares/is-authorized';
import ownsRecord from '../middlewares/owns-record';
import { updateSchema, recordSchema } from '../contract';
import { updateRecord } from '../methods';

export default endpoint
  .use(isAuthorized)
  .route({ method: 'PUT', path: '/projects/{id}' })
  .input(updateSchema)
  .use(ownsRecord)
  .output(recordSchema)
  .handler(({ context, input }) => updateRecord(context.user.id, input));
