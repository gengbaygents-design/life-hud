import db from '@/db';
import endpoint from '@/endpoint';
import isAuthorized from '@/middlewares/is-authorized';
import canEditChat from '@/resources/ai-chats/middlewares/can-edit-chat';
import { z } from 'zod';
import { generateResponse, isAiConfigured } from '@ship/ai';
import { ORPCError } from '@orpc/server';

const inputSchema = z.object({
  chatId: z.string(),
  content: z.string().trim().min(1).max(16000),
});

const outputSchema = z.object({
  userMessage: z.object({
    id: z.string(),
    role: z.literal('user'),
    content: z.string(),
  }),
  assistantMessage: z.object({
    id: z.string(),
    role: z.literal('assistant'),
    content: z.string(),
  }),
});

export default endpoint
  .use(isAuthorized)
  .route({ method: 'POST', path: '/ai-chats/{chatId}/messages' })
  .input(inputSchema)
  .use(canEditChat)
  .output(outputSchema)
  .handler(async ({ context, input }) => {
    if (context.chat.kind === 'LIM') throw new ORPCError('BAD_REQUEST', { message: 'Use the Lim turn endpoint for this conversation' });
    if (!isAiConfigured()) throw new ORPCError('SERVICE_UNAVAILABLE', { message: 'AI provider is not configured' });
    const userMessage = await db.aiMessages.insertOne({
      chatId: input.chatId,
      role: 'user',
      content: input.content,
    });

    const allMessages = await db.aiMessages.find({
      where: { chatId: input.chatId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      limit: 50,
    });

    const aiMessages = allMessages.reverse().map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    let responseText: string;
    try { responseText = await generateResponse(aiMessages); }
    catch { throw new ORPCError('SERVICE_UNAVAILABLE', { message: 'AI provider unavailable; your original message is preserved' }); }

    const assistantMessage = await db.aiMessages.insertOne({
      chatId: input.chatId,
      role: 'assistant',
      content: responseText,
    });

    if (context.chat.title === 'New Chat') {
      const title = input.content.slice(0, 50) + (input.content.length > 50 ? '...' : '');
      await db.aiChats.updateOne({ id: input.chatId }, { title });
    }

    return {
      userMessage: { id: userMessage.id, role: 'user' as const, content: userMessage.content },
      assistantMessage: { id: assistantMessage.id, role: 'assistant' as const, content: assistantMessage.content },
    };
  });
