import endpoint from '@/endpoint';
import isAuthorized from '@/middlewares/is-authorized';
import { z } from 'zod';
import { providerStatus } from '../provider';
export default endpoint
  .use(isAuthorized)
  .route({ method: 'GET', path: '/lim/status' })
  .output(z.object({ available: z.boolean(), kind: z.string() }))
  .handler(() => providerStatus());
