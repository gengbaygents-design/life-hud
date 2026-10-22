import endpoint from '@/endpoint';
import isAuthorized from '@/middlewares/is-authorized';
import { actionSchema, recordSchema } from '../contract';
import { markAssignmentSubmitted } from '../methods';
export default endpoint
  .use(isAuthorized)
  .route({ method: 'POST', path: '/assignments/{id}/submit' })
  .input(actionSchema)
  .output(recordSchema)
  .handler(({ context, input }) =>
    markAssignmentSubmitted(context.user.id, input),
  );
