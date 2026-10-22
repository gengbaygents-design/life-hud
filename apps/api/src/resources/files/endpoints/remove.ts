import { z } from 'zod';
import { removeOwnedFile } from '../methods';

import endpoint from '@/endpoint';
import isAuthorized from '@/middlewares/is-authorized';

export default endpoint
  .use(isAuthorized)
  .input(z.object({ key: z.string(), confirm: z.literal(true) }).strict())
  .output(z.object({ success: z.boolean() }))
  .handler(({ input, context }) => removeOwnedFile(context.user.id, input.key));
