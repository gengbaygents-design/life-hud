import db from '@/db';
import endpoint from '@/endpoint';
import isAuthorized from '@/middlewares/is-authorized';
import canEditChat from '@/resources/ai-chats/middlewares/can-edit-chat';
import { z } from 'zod';
import { ORPCError } from '@orpc/server';

const inputSchema = z.object({
  chatId: z.string(),
  confirm: z.literal(true),
});

export default endpoint
  .use(isAuthorized)
  .route({ method: 'DELETE', path: '/ai-chats/{chatId}' })
  .input(inputSchema)
  .use(canEditChat)
  .output(z.void())
  .handler(async ({ input, context }) => {
    if(context.chat.kind==='LIM')throw new ORPCError('BAD_REQUEST',{message:'Lim conversation removal is not part of this phase'});
    await db.transaction(async (tx) => {
      await tx.aiMessages.deleteMany({ chatId: input.chatId });
      await tx.aiChats.deleteOne({ id: input.chatId });
    });
  });
