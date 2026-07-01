import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SupportMessage {
  id: string;
  worker_id: string;
  sender: 'user' | 'admin';
  body: string;
  created_at: string;
  read_at: string | null;
}

export interface SupportConversation {
  worker_id: string;
  last_message_at: string;
  last_sender: 'user' | 'admin';
  last_message_preview: string | null;
  unread_admin: number;
  unread_user: number;
}

/**
 * Hook powering the user-side live support chat widget.
 * - Fetches history + subscribes to realtime inserts
 * - Sends messages via the `support-chat` edge function
 * - Exposes unreadCount for the FAB red-dot badge
 */
export function useSupportChat(workerId: string | null) {
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [conversation, setConversation] = useState<SupportConversation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const refresh = useCallback(async () => {
    if (!workerId) return;
    setIsLoading(true);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('support-chat', {
        body: { action: 'list_messages', worker_id: workerId },
      });
      if (fnErr) throw fnErr;
      if (!mountedRef.current) return;
      if (data?.success) {
        setMessages(data.messages || []);
        setConversation(data.conversation || null);
        setError(null);
      } else {
        setError(data?.error || 'Failed to load messages');
      }
    } catch (e) {
      if (mountedRef.current) setError(e instanceof Error ? e.message : 'Failed to load messages');
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, [workerId]);

  // Initial load + realtime subscription
  useEffect(() => {
    if (!workerId) return;
    refresh();

    const channel = supabase
      .channel(`support-${workerId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `worker_id=eq.${workerId}` },
        (payload) => {
          const newMsg = payload.new as SupportMessage;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'support_conversations', filter: `worker_id=eq.${workerId}` },
        (payload) => {
          setConversation((payload.new as SupportConversation) || null);
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [workerId, refresh]);

  const send = useCallback(async (body: string): Promise<boolean> => {
    if (!workerId) return false;
    const text = body.trim();
    if (!text) return false;
    setIsSending(true);
    setError(null);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('support-chat', {
        body: { action: 'send_message', worker_id: workerId, params: { body: text } },
      });
      if (fnErr) throw fnErr;
      if (!data?.success) {
        setError(data?.error || 'Failed to send message');
        return false;
      }
      // Realtime will deliver — but push locally for instant feel too
      if (data.message) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.message.id)) return prev;
          return [...prev, data.message as SupportMessage];
        });
      }
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send message');
      return false;
    } finally {
      if (mountedRef.current) setIsSending(false);
    }
  }, [workerId]);

  const markRead = useCallback(async () => {
    if (!workerId) return;
    try {
      await supabase.functions.invoke('support-chat', {
        body: { action: 'mark_read', worker_id: workerId },
      });
      setConversation((prev) => prev ? { ...prev, unread_user: 0 } : prev);
    } catch (e) {
      console.error('Failed to mark support conversation read', e);
    }
  }, [workerId]);

  return {
    messages,
    conversation,
    unreadCount: conversation?.unread_user ?? 0,
    isLoading,
    isSending,
    error,
    send,
    markRead,
    refresh,
  };
}
