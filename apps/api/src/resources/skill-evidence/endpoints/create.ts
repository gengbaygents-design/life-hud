import endpoint from '@/endpoint';
import isAuthorized from '@/middlewares/is-authorized';
import {
  confirmedCreateSchema as createSchema,
  recordSchema,
} from '../contract';
import { createRecord } from '../methods';
export default endpoint
  .use(isAuthorized)
  .route({ method: 'POST', path: '/skill-evidence' })
  .input(createSchema)
  .output(recordSchema)
  .handler(({ context, input }) => createRecord(context.user.id, input));
