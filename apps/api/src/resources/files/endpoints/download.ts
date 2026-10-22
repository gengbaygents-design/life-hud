import endpoint from '@/endpoint';
import isAuthorized from '@/middlewares/is-authorized';
import { z } from 'zod';
import { idSchema } from '../../core-contract';
import { getFileUrl } from '../methods';
export default endpoint
  .use(isAuthorized)
  .route({ method: 'GET', path: '/files/{id}/download' })
  .input(idSchema)
  .output(z.object({ url: z.string() }))
  .handler(({ context, input }) => getFileUrl(context.user.id, input.id));
