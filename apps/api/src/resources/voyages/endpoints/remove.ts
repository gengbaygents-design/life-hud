import endpoint from '@/endpoint';
import isAuthorized from '@/middlewares/is-authorized';
import ownsRecord from '../middlewares/owns-record';
import { confirmSchema } from '@/resources/core-contract';
import { recordSchema } from '../contract';
import { removeRecord } from '../methods';

export default endpoint
  .use(isAuthorized)
  .route({ method: 'DELETE', path: '/voyages/{id}' })
  .input(confirmSchema)
  .use(ownsRecord)
  .output(recordSchema)
  .handler(({ context, input }) => removeRecord(context.user.id, input));
