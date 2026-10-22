import endpoint from '@/endpoint';
import isAuthorized from '@/middlewares/is-authorized';
import ownsRecord from '../middlewares/owns-record';
import { idSchema } from '@/resources/core-contract';
import { recordSchema } from '../contract';
import { getRecord } from '../methods';

export default endpoint
  .use(isAuthorized)
  .route({ method: 'GET', path: '/goals/{id}' })
  .input(idSchema)
  .use(ownsRecord)
  .output(recordSchema)
  .handler(({ context, input }) => getRecord(context.user.id, input));
