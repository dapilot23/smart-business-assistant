"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { AiAssistantPanel } from '@/components/messaging/ai-assistant-panel';
import { ConversationList } from '@/components/messaging/conversation-list';
import { ConversationThreadView } from '@/components/messaging/conversation-thread';
import {
  ConversationThread,
  Message,
  getConversation,
  listConversations,
  markConversationRead,
  sendMessage,
} from '@/lib/api/messaging';
import {
  acceptSuggestedResponse,
  dismissSuggestedResponse,
  generateSuggestedResponses,
  listSuggestedResponses,
} from '@/lib/api/ai-communication';
import { SuggestedResponse } from '@/lib/types/ai-communication';

export default function InboxPage() {
  const [conversations, setConversations] = useState<ConversationThread[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [current, setCurrent] = useState<ConversationThread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestedResponse[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const selectConversation = useCallback(async (id: string) => {
    setSelectedId(id);
    setLoadingConversation(true);
    try {
      const conversation = await getConversation(id);
      setCurrent(conversation);
      setMessages(conversation.messages || []);
      await markConversationRead(id);
      const pending = await listSuggestedResponses(id);
      setSuggestions(pending);
    } catch (error) {
      console.error('Failed to load conversation', error);
    } finally {
      setLoadingConversation(false);
    }
  }, []);

  const loadConversations = useCallback(async () => {
    try {
      setLoading(true);
      const data = await listConversations();
      setConversations(data);
      if (!selectedId && data.length > 0) {
        await selectConversation(data[0].id);
      }
    } catch (error) {
      console.error('Failed to load conversations', error);
    } finally {
      setLoading(false);
    }
  }, [selectedId, selectConversation]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const sortedConversations = useMemo(() => {
    return [...conversations].sort((a, b) => {
      const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      return bTime - aTime;
    });
  }, [conversations]);

  async function handleSend() {
    if (!current || !messageInput.trim()) return;
    try {
      await sendMessage(current.id, messageInput.trim());
      setMessageInput('');
      await selectConversation(current.id);
    } catch (error) {
      console.error('Failed to send message', error);
    }
  }

  async function handleGenerateSuggestions() {
    if (!current) return;
    try {
      setLoadingSuggestions(true);
      const generated = await generateSuggestedResponses(current.id, { count: 3 });
      setSuggestions(generated);
    } catch (error) {
      console.error('Failed to generate suggestions', error);
    } finally {
      setLoadingSuggestions(false);
    }
  }

  async function handleAcceptSuggestion(id: string, editedText?: string) {
    try {
      await acceptSuggestedResponse(id, editedText);
      if (current) {
        await selectConversation(current.id);
      }
    } catch (error) {
      console.error('Failed to accept suggestion', error);
    }
  }

  async function handleDismissSuggestion(id: string) {
    try {
      await dismissSuggestedResponse(id);
      if (current) {
        const pending = await listSuggestedResponses(current.id);
        setSuggestions(pending);
      }
    } catch (error) {
      console.error('Failed to dismiss suggestion', error);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-5 border-b border-border">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Inbox</h1>
          <p className="text-sm text-muted-foreground">Respond to customers with AI suggestions</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadConversations}>
          Refresh
        </Button>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 p-6">
        <ConversationList
          conversations={sortedConversations}
          selectedId={selectedId}
          loading={loading}
          onSelect={selectConversation}
        />

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">
          <ConversationThreadView
            conversation={current}
            messages={messages}
            loading={loadingConversation}
            messageInput={messageInput}
            onMessageChange={setMessageInput}
            onSend={handleSend}
          />

          <AiAssistantPanel
            suggestions={suggestions}
            loading={loadingSuggestions}
            onGenerate={handleGenerateSuggestions}
            onAccept={handleAcceptSuggestion}
            onDismiss={handleDismissSuggestion}
          />
        </div>
      </div>
    </div>
  );
}
