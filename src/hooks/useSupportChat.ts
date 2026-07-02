import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SupportMessage {
  id: string;
  worker_id: string;
  sender: 'user' | 'admin';
  body: string;
  created_at: string;
  read_at: string | null;
  reply_to_id?: string | null;
  image_url?: string | null;
  deleted_at?: string | null;
  deleted_for?: string | null;
}

export interface SupportConversation {
  worker_id: string;
  last_message_at: string;
  last_sender: 'user' | 'admin';
  last_message_preview: string | null;
  unread_admin: number;
  unread_user: number;
  blocked?: boolean;
  blocked_reason?: string | null;
}

export interface SendOptions {
  reply_to_id?: string | null;
  image_url?: string | null;
}

export function useSupportChat(workerId: string | null) {
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [conversation, setConversation] = useState<SupportConversation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
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
      } else setError(data?.error || 'Failed to load messages');
    } catch (e) {
      if (mountedRef.current) setError(e instanceof Error ? e.message : 'Failed to load messages');
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, [workerId]);

  useEffect(() => {
    if (!workerId) return;
    refresh();
    const channel = supabase.channel(`support-${workerId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `worker_id=eq.${workerId}` },
        (payload) => {
          const newMsg = payload.new as SupportMessage;
          setMessages((prev) => prev.some((m) => m.id === newMsg.id) ? prev : [...prev, newMsg]);
        })
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'support_messages', filter: `worker_id=eq.${workerId}` },
        (payload) => {
          const upd = payload.new as SupportMessage;
          setMessages((prev) => prev.map((m) => m.id === upd.id ? { ...m, ...upd } : m));
        })
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'support_conversations', filter: `worker_id=eq.${workerId}` },
        (payload) => { setConversation((payload.new as SupportConversation) || null); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [workerId, refresh]);

  const send = useCallback(async (body: string, opts: SendOptions = {}): Promise<boolean> => {
    if (!workerId) return false;
    const text = body.trim();
    if (!text && !opts.image_url) return false;
    setIsSending(true);
    setError(null);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('support-chat', {
        body: { action: 'send_message', worker_id: workerId, params: { body: text, ...opts } },
      });
      if (fnErr) throw fnErr;
      if (!data?.success) { setError(data?.error || 'Failed to send message'); return false; }
      if (data.message) {
        setMessages((prev) => prev.some((m) => m.id === data.message.id) ? prev : [...prev, data.message as SupportMessage]);
      }
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send message');
      return false;
    } finally {
      if (mountedRef.current) setIsSending(false);
    }
  }, [workerId]);

  const uploadImage = useCallback(async (file: File): Promise<string | null> => {
    if (!workerId) return null;
    setIsUploading(true); setError(null);
    try {
      if (file.size > 5 * 1024 * 1024) { setError('Image too large (max 5MB)'); return null; }
      const dataUrl: string = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result as string);
        r.onerror = () => rej(new Error('Read failed'));
        r.readAsDataURL(file);
      });
      const { data, error: fnErr } = await supabase.functions.invoke('support-chat', {
        body: { action: 'upload_image', worker_id: workerId, params: { data_url: dataUrl } },
      });
      if (fnErr) throw fnErr;
      if (!data?.success) { setError(data?.error || 'Upload failed'); return null; }
      return data.image_url as string;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
      return null;
    } finally { if (mountedRef.current) setIsUploading(false); }
  }, [workerId]);

  const deleteForMe = useCallback(async (messageId: string) => {
    if (!workerId) return;
    await supabase.functions.invoke('support-chat', {
      body: { action: 'delete_for_me', worker_id: workerId, params: { message_id: messageId } },
    });
    setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, deleted_for: 'user' } : m));
  }, [workerId]);

  const markRead = useCallback(async () => {
    if (!workerId) return;
    try {
      await supabase.functions.invoke('support-chat', { body: { action: 'mark_read', worker_id: workerId } });
      setConversation((prev) => prev ? { ...prev, unread_user: 0 } : prev);
    } catch (e) { console.error('Failed to mark read', e); }
  }, [workerId]);

  return {
    messages,
    conversation,
    isBlocked: !!conversation?.blocked,
    unreadCount: conversation?.unread_user ?? 0,
    isLoading, isSending, isUploading, error,
    send, uploadImage, deleteForMe, markRead, refresh,
  };
}
