import { useCallback, useEffect, useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { MessageSquare } from 'lucide-react';

import { queryKey, useApiMutation, useQueryClient } from '@/hooks';
import { apiClient } from '@/services/api-client.service';

import type { AiChatDisplayMessage } from './-components';
import { AiChatBox } from './-components';

export const Route = createFileRoute('/_authenticated/app/ai-chat/')({
  staticData: { nav: { label: 'AI Chat', icon: MessageSquare, order: 20 } },
  component: AiChatIndexPage,
});

export function AiChatPage({ chatId: initialChatId }: { chatId?: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeChatId, setActiveChatId] = useState<string | null>(initialChatId ?? null);
  const [messages, setMessages] = useState<AiChatDisplayMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [input, setInput] = useState('');

  const createChatMutation = useApiMutation(apiClient['ai-chats'].create, {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKey(apiClient['ai-chats'].list) });
    },
  });

  const sendMessageMutation = useApiMutation(apiClient['ai-chats'].sendMessage, {
    onSuccess: (data, variables) => {
      setMessages((prev) => {
        const withoutOptimistic = prev.filter((m) => !m.id.startsWith('temp-'));
        return [
          ...withoutOptimistic,
          { id: data.userMessage.id, role: data.userMessage.role, content: data.userMessage.content },
          { id: data.assistantMessage.id, role: data.assistantMessage.role, content: data.assistantMessage.content },
        ];
      });
      queryClient.invalidateQueries({ queryKey: queryKey(apiClient['ai-chats'].list) });
      if (!initialChatId) void navigate({ to: '/app/ai-chat/$chatId', params: { chatId: variables.chatId }, replace: true });
    },
    onError: (_error, variables) => {
      setInput(variables.content);
      setMessages((prev) => prev.filter((m) => !m.id.startsWith('temp-')));
    },
  });

  const loadMessages = useCallback(async (chatId: string) => {
    setIsLoadingMessages(true);
    try {
      const result = await apiClient['ai-chats'].getMessages({ chatId });
      setMessages(
        result.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
        })),
      );
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setIsLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    if (activeChatId) {
      loadMessages(activeChatId);
    }
  }, [activeChatId, loadMessages]);

  const handleSubmit = useCallback(async () => {
    if (!input.trim() || sendMessageMutation.isPending) {
      return;
    }

    const content = input.trim();
    setInput('');

    let chatId = activeChatId;

    if (!chatId) {
      try {
        const newChat = await createChatMutation.mutateAsync({ title: 'New Chat' });
        chatId = newChat.id;
        setActiveChatId(chatId);
      } catch {
        setInput(content);
        return;
      }
    }

    setMessages((prev) => [
      ...prev,
      { id: `temp-${Date.now()}`, role: 'user', content },
    ]);

    sendMessageMutation.mutate({ chatId, content });
  }, [input, activeChatId, sendMessageMutation, createChatMutation]);

  return (
    <div className="flex h-full flex-col">
      {(sendMessageMutation.isError || createChatMutation.isError) && <p role="alert">对话请求未完成。请检查本地服务或 AI 提供方配置；输入已保留。</p>}
      <div className="flex-1">
        <AiChatBox
          messages={messages}
          input={input}
          onInputChange={setInput}
          onSubmit={handleSubmit}
          isLoading={sendMessageMutation.isPending}
          isLoadingMessages={isLoadingMessages && !!initialChatId}
        />
      </div>
    </div>
  );
}

function AiChatIndexPage() {
  return <AiChatPage />;
}
