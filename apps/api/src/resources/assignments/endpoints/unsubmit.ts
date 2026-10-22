import endpoint from '@/endpoint';
import isAuthorized from '@/middlewares/is-authorized';
import { actionSchema, recordSchema } from '../contract';
import { markAssignmentNotSubmitted } from '../methods';
export default endpoint
  .use(isAuthorized)
  .route({ method: 'POST', path: '/assignments/{id}/unsubmit' })
  .input(actionSchema)
  .output(recordSchema)
  .handler(({ context, input }) =>
    markAssignmentNotSubmitted(context.user.id, input),
  );
