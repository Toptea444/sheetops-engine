import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAdminData } from '@/hooks/useAdminData';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { MessageCircle, Search, Send, Trash2, RefreshCw, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Conv {
  worker_id: string;
  last_message_at: string;
  last_sender: 'user' | 'admin';
  last_message_preview: string | null;
  unread_admin: number;
  unread_user: number;
}
interface Msg {
  id: string;
  worker_id: string;
  sender: 'user' | 'admin';
  body: string;
  created_at: string;
  read_at: string | null;
}

interface Props { adminSecret: string }

export function SupportTab({ adminSecret }: Props) {
  const [conversations, setConversations] = useState<Conv[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminInvoke('support_list_conversations', {}, adminSecret);
      if (res?.success) setConversations(res.data?.conversations || []);
      else toast.error(res?.error || 'Failed to load conversations');
    } finally { setLoading(false); }
  }, [adminSecret]);

  const loadMessages = useCallback(async (wid: string) => {
    const res = await adminInvoke('support_get_messages', { worker_id: wid }, adminSecret);
    if (res?.success) setMessages(res.data?.messages || []);
    // Mark this conversation read
    await adminInvoke('support_mark_conversation_read', { worker_id: wid }, adminSecret);
    setConversations((prev) => prev.map((c) => c.worker_id === wid ? { ...c, unread_admin: 0 } : c));
  }, [adminSecret]);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  // Realtime: any new message → refresh list; if it's the open conv, append
  useEffect(() => {
    const channel = supabase
      .channel('admin-support-inbox')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'support_messages' },
        (payload) => {
          const m = payload.new as Msg;
          if (selectedId && m.worker_id === selectedId) {
            setMessages((prev) => prev.some((x) => x.id === m.id) ? prev : [...prev, m]);
          }
          loadConversations();
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedId, loadConversations]);

  // Auto-scroll thread
  useEffect(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    });
  }, [messages, selectedId]);

  const filtered = useMemo(() => {
    const q = query.trim().toUpperCase();
    if (!q) return conversations;
    return conversations.filter((c) =>
      c.worker_id.includes(q) ||
      (c.last_message_preview || '').toUpperCase().includes(q),
    );
  }, [conversations, query]);

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unread_admin || 0), 0);

  const openConv = (wid: string) => {
    setSelectedId(wid);
    setMessages([]);
    loadMessages(wid);
  };

  const handleSendReply = async () => {
    if (!selectedId || !reply.trim()) return;
    setSending(true);
    try {
      const res = await adminInvoke('support_send_reply', { worker_id: selectedId, body: reply.trim() }, adminSecret);
      if (res?.success) {
        setReply('');
        if (res.data?.message) {
          setMessages((prev) => prev.some((x) => x.id === res.data.message.id) ? prev : [...prev, res.data.message]);
        }
        loadConversations();
      } else {
        toast.error(res?.error || 'Failed to send reply');
      }
    } finally { setSending(false); }
  };

  const handleDelete = async (wid: string) => {
    const res = await adminInvoke('support_delete_conversation', { worker_id: wid }, adminSecret);
    if (res?.success) {
      toast.success(`Deleted conversation with ${wid}`);
      if (selectedId === wid) { setSelectedId(null); setMessages([]); }
      loadConversations();
    } else {
      toast.error(res?.error || 'Failed to delete');
    }
    setConfirmDelete(null);
  };

  return (
    <Card>
      <CardContent className="p-0">
        <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] min-h-[560px]">
          {/* Conversation list */}
          <div className="border-b md:border-b-0 md:border-r border-border flex flex-col">
            <div className="p-3 border-b border-border">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" /> Support Inbox
                  {totalUnread > 0 && (
                    <span className="h-5 min-w-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                      {totalUnread}
                    </span>
                  )}
                </h3>
                <Button variant="ghost" size="icon" onClick={loadConversations} disabled={loading}>
                  <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
                </Button>
              </div>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search worker ID or text…"
                  className="pl-7 h-8 text-xs"
                />
              </div>
            </div>
            <div className="overflow-y-auto flex-1 max-h-[520px]">
              {filtered.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  {loading ? 'Loading…' : 'No conversations yet'}
                </div>
              ) : filtered.map((c) => (
                <button
                  key={c.worker_id}
                  onClick={() => openConv(c.worker_id)}
                  className={cn(
                    'w-full text-left px-3 py-2.5 border-b border-border/50 hover:bg-muted/50 transition-colors flex items-start gap-2',
                    selectedId === c.worker_id && 'bg-muted',
                  )}
                >
                  <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-foreground truncate">{c.worker_id}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {new Date(c.last_message_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                      {c.last_sender === 'admin' ? 'You: ' : ''}{c.last_message_preview || '—'}
                    </p>
                  </div>
                  {c.unread_admin > 0 && (
                    <span className="h-4 min-w-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center mt-1">
                      {c.unread_admin}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Thread */}
          <div className="flex flex-col">
            {!selectedId ? (
              <div className="flex-1 flex items-center justify-center text-center p-10 text-muted-foreground">
                <div>
                  <MessageCircle className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">Select a conversation to reply</p>
                </div>
              </div>
            ) : (
              <>
                <div className="p-3 border-b border-border flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">{selectedId}</p>
                    <p className="text-[11px] text-muted-foreground">{messages.length} message{messages.length !== 1 && 's'}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setConfirmDelete(selectedId)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-4 space-y-3 max-h-[420px] bg-background/50">
                  {messages.map((m) => (
                    <div key={m.id} className={cn('flex flex-col max-w-[78%]', m.sender === 'admin' ? 'ml-auto items-end' : 'mr-auto items-start')}>
                      <div className={cn(
                        'px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words',
                        m.sender === 'admin' ? 'bg-primary text-primary-foreground rounded-br-md' : 'bg-muted text-foreground rounded-bl-md',
                      )}>
                        {m.body}
                      </div>
                      <span className="text-[10px] text-muted-foreground mt-1 px-1">
                        {m.sender === 'admin' ? 'You' : selectedId} · {new Date(m.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="p-2.5 border-t border-border flex items-end gap-2">
                  <Textarea
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendReply(); }
                    }}
                    rows={1}
                    placeholder="Write a reply…"
                    className="min-h-[40px] max-h-32 text-sm"
                  />
                  <Button onClick={handleSendReply} disabled={sending || !reply.trim()} size="icon" className="h-10 w-10 shrink-0">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </CardContent>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all messages with <strong>{confirmDelete}</strong>. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmDelete && handleDelete(confirmDelete)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
