import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAdminData } from '@/hooks/useAdminData';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  MessageCircle, Search, Send, Trash2, RefreshCw, User, Ban, Megaphone,
  Image as ImageIcon, Reply, X, CheckSquare, ShieldOff, Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useSwipeReply } from '@/hooks/useSwipeReply';
import { dayLabel, isNewDay } from '@/lib/chatDates';

interface Conv {
  worker_id: string;
  last_message_at: string;
  last_sender: 'user' | 'admin';
  last_message_preview: string | null;
  unread_admin: number;
  unread_user: number;
  blocked?: boolean;
  blocked_reason?: string | null;
}
interface Msg {
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

interface Props { adminSecret: string }

export function SupportTab({ adminSecret }: Props) {
  const { adminRequest } = useAdminData();
  const [conversations, setConversations] = useState<Conv[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [reply, setReply] = useState('');
  const [replyTo, setReplyTo] = useState<Msg | null>(null);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [confirmDeleteConv, setConfirmDeleteConv] = useState<string | null>(null);

  // Multi-select delete
  const [selectedMsgIds, setSelectedMsgIds] = useState<Set<string>>(new Set());
  const [confirmDeleteMsgs, setConfirmDeleteMsgs] = useState<null | 'everyone' | 'admin'>(null);
  const [deletingMsgs, setDeletingMsgs] = useState(false);

  // Block
  const [blockDialog, setBlockDialog] = useState<null | Conv>(null);
  const [blockReason, setBlockReason] = useState('');

  // Broadcast
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [broadcastBody, setBroadcastBody] = useState('');
  const [confirmBroadcast, setConfirmBroadcast] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);

  const [floatingDate, setFloatingDate] = useState<string | null>(null);
  const [dateVisible, setDateVisible] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadConversations = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminRequest(adminSecret, 'support_list_conversations');
      if (data) setConversations(data.conversations || []);
    } finally { setLoading(false); }
  }, [adminRequest, adminSecret]);

  const loadMessages = useCallback(async (wid: string) => {
    const data = await adminRequest(adminSecret, 'support_get_messages', { worker_id: wid });
    if (data) setMessages(data.messages || []);
    await adminRequest(adminSecret, 'support_mark_conversation_read', { worker_id: wid });
    setConversations((prev) => prev.map((c) => c.worker_id === wid ? { ...c, unread_admin: 0 } : c));
  }, [adminRequest, adminSecret]);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  useEffect(() => {
    const channel = supabase.channel('admin-support-inbox')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_messages' }, (payload) => {
        const m = payload.new as Msg;
        if (selectedId && m.worker_id === selectedId) {
          setMessages((prev) => prev.some((x) => x.id === m.id) ? prev : [...prev, m]);
        }
        loadConversations();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'support_messages' }, (payload) => {
        const m = payload.new as Msg;
        if (selectedId && m.worker_id === selectedId) {
          setMessages((prev) => prev.map((x) => x.id === m.id ? { ...x, ...m } : x));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedId, loadConversations]);

  useEffect(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    });
  }, [messages.length, selectedId]);

  const filtered = useMemo(() => {
    const q = query.trim().toUpperCase();
    let list = conversations;
    if (unreadOnly) list = list.filter((c) => (c.unread_admin || 0) > 0);
    if (q) list = list.filter((c) => c.worker_id.includes(q) || (c.last_message_preview || '').toUpperCase().includes(q));
    return list;
  }, [conversations, query, unreadOnly]);

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unread_admin || 0), 0);
  const currentConv = conversations.find((c) => c.worker_id === selectedId) || null;

  const visibleMsgs = useMemo(() => messages.filter((m) => m.deleted_for !== 'admin'), [messages]);
  const msgById = useMemo(() => {
    const m = new Map<string, Msg>();
    messages.forEach((x) => m.set(x.id, x));
    return m;
  }, [messages]);

  const openConv = (wid: string) => {
    setSelectedId(wid); setMessages([]); setSelectedMsgIds(new Set());
    setReplyTo(null); setPendingImage(null);
    loadMessages(wid);
  };

  const onScroll = () => {
    const el = scrollRef.current; if (!el) return;
    const rows = el.querySelectorAll<HTMLElement>('[data-msg-time]');
    const topBound = el.getBoundingClientRect().top;
    let first: HTMLElement | null = null;
    for (const r of Array.from(rows)) { if (r.getBoundingClientRect().bottom >= topBound + 4) { first = r; break; } }
    if (first) {
      const t = first.getAttribute('data-msg-time');
      if (t) {
        setFloatingDate(dayLabel(new Date(t)));
        setDateVisible(true);
        if (hideTimer.current) clearTimeout(hideTimer.current);
        hideTimer.current = setTimeout(() => setDateVisible(false), 1400);
      }
    }
  };

  const handleImagePick = async (file: File) => {
    if (!selectedId) return;
    setUploading(true);
    try {
      if (file.size > 5 * 1024 * 1024) { toast.error('Image too large (max 5MB)'); return; }
      const dataUrl: string = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result as string);
        r.onerror = () => rej(new Error('Read failed'));
        r.readAsDataURL(file);
      });
      // Reuse support-chat upload_image action via worker_id
      const { data, error: fnErr } = await supabase.functions.invoke('support-chat', {
        body: { action: 'upload_image', worker_id: selectedId, params: { data_url: dataUrl } },
      });
      if (fnErr || !data?.success) { toast.error(data?.error || 'Upload failed'); return; }
      setPendingImage(data.image_url as string);
    } finally { setUploading(false); }
  };

  const handleSendReply = async () => {
    if (!selectedId) return;
    if (!reply.trim() && !pendingImage) return;
    setSending(true);
    try {
      const data = await adminRequest(adminSecret, 'support_send_reply', {
        worker_id: selectedId, body: reply.trim(),
        reply_to_id: replyTo?.id ?? null, image_url: pendingImage,
      });
      if (data) {
        setReply(''); setReplyTo(null); setPendingImage(null);
        if (data.message) setMessages((prev) => prev.some((x) => x.id === data.message.id) ? prev : [...prev, data.message as Msg]);
        loadConversations();
      } else toast.error('Failed to send reply');
    } finally { setSending(false); }
  };

  const handleDeleteConversation = async (wid: string) => {
    const data = await adminRequest(adminSecret, 'support_delete_conversation', { worker_id: wid });
    if (data) {
      toast.success(`Deleted conversation with ${wid}`);
      if (selectedId === wid) { setSelectedId(null); setMessages([]); }
      loadConversations();
    } else toast.error('Failed to delete');
    setConfirmDeleteConv(null);
  };

  const handleDeleteMessages = async (mode: 'everyone' | 'admin') => {
    const ids = Array.from(selectedMsgIds);
    if (!ids.length || deletingMsgs) return;
    setDeletingMsgs(true);
    try {
      const data = await adminRequest(adminSecret, 'support_delete_messages', { message_ids: ids, mode });
      if (data?.success) {
        toast.success(`Deleted ${ids.length} message${ids.length > 1 ? 's' : ''}`);
        setMessages((prev) => prev.map((m) => ids.includes(m.id) ? { ...m, deleted_for: mode, deleted_at: new Date().toISOString() } : m));
        setSelectedMsgIds(new Set());
      } else toast.error('Failed to delete');
    } finally {
      setDeletingMsgs(false);
      setConfirmDeleteMsgs(null);
    }
  };

  const handleToggleBlock = async () => {
    if (!blockDialog) return;
    const wasBlocked = !!blockDialog.blocked;
    const data = await adminRequest(adminSecret, 'support_toggle_block', {
      worker_id: blockDialog.worker_id,
      blocked: !wasBlocked,
      reason: !wasBlocked ? blockReason.trim() : null,
    });
    if (data?.success) {
      toast.success(!wasBlocked ? `Blocked ${blockDialog.worker_id}` : `Unblocked ${blockDialog.worker_id}`);
      loadConversations();
    } else toast.error('Failed to update');
    setBlockDialog(null); setBlockReason('');
  };

  const handleBroadcast = async () => {
    if (!broadcastBody.trim()) return;
    setBroadcasting(true);
    try {
      const data = await adminRequest(adminSecret, 'support_broadcast', { body: broadcastBody.trim() });
      if (data?.success) {
        toast.success(`Sent to ${data.count} user${data.count > 1 ? 's' : ''}`);
        setBroadcastBody(''); setBroadcastOpen(false); setConfirmBroadcast(false);
        loadConversations();
      } else toast.error(data?.error || 'Broadcast failed');
    } finally { setBroadcasting(false); }
  };

  const toggleMsg = (id: string) => {
    setSelectedMsgIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const enterSelectWith = (id: string) => {
    setSelectedMsgIds((prev) => {
      if (prev.size > 0) return prev;
      return new Set([id]);
    });
  };

  return (
    <Card>
      <CardContent className="p-0">
        <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] min-h-[560px]">
          {/* List */}
          <div className="border-b md:border-b-0 md:border-r border-border flex flex-col">
            <div className="p-3 border-b border-border">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" /> Support Inbox
                  {totalUnread > 0 && (
                    <span className="h-6 min-w-6 px-2 rounded-full bg-red-500 text-white text-[11px] font-bold flex items-center justify-center animate-pulse border border-red-600">
                      {totalUnread > 99 ? '99+' : totalUnread}
                    </span>
                  )}
                </h3>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={() => setBroadcastOpen(true)} title="Broadcast to all">
                    <Megaphone className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={loadConversations} disabled={loading}>
                    <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
                  </Button>
                </div>
              </div>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search worker ID or text…" className="pl-7 h-8 text-xs" />
              </div>
              <button
                onClick={() => setUnreadOnly((v) => !v)}
                className={cn('mt-2 w-full text-[11px] font-medium h-7 rounded-md border transition-colors',
                  unreadOnly ? 'bg-primary text-primary-foreground border-primary' : 'bg-transparent text-muted-foreground border-border hover:bg-muted')}
              >
                {unreadOnly ? 'Showing unread only' : 'Show unread only'}
              </button>
            </div>
            <div className="overflow-y-auto flex-1 max-h-[520px]">
              {filtered.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">{loading ? 'Loading…' : 'No conversations yet'}</div>
              ) : filtered.map((c) => {
                const isUnread = (c.unread_admin || 0) > 0;
                return (
                  <button key={c.worker_id} onClick={() => openConv(c.worker_id)}
                    className={cn('w-full text-left px-3 py-2.5 border-b border-border/50 hover:bg-muted/50 transition-colors flex items-start gap-2 relative',
                      selectedId === c.worker_id && 'bg-muted', isUnread && 'bg-primary/5')}>
                    {isUnread && <span className="absolute left-0 top-0 bottom-0 w-1 bg-primary" aria-hidden />}
                    <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5 relative">
                      <User className="h-3.5 w-3.5 text-primary" />
                      {isUnread && <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-primary border-2 border-background" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={cn('text-xs truncate flex items-center gap-1', isUnread ? 'font-bold text-foreground' : 'font-semibold text-foreground')}>
                          {c.worker_id}
                          {c.blocked && <Ban className="h-3 w-3 text-destructive" />}
                        </span>
                        <span className={cn('text-[10px] shrink-0', isUnread ? 'text-primary font-semibold' : 'text-muted-foreground')}>
                          {new Date(c.last_message_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className={cn('text-[11px] truncate mt-0.5', isUnread ? 'text-foreground font-medium' : 'text-muted-foreground')}>
                        {c.last_sender === 'admin' ? 'You: ' : ''}{c.last_message_preview || '—'}
                      </p>
                    </div>
                    {isUnread && (
                      <span className="h-4 min-w-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center mt-1">{c.unread_admin}</span>
                    )}
                  </button>
                );
              })}
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
                <div className="p-3 border-b border-border flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold flex items-center gap-2">
                      {selectedId}
                      {currentConv?.blocked && <span className="text-[10px] px-1.5 py-0.5 rounded bg-destructive/10 text-destructive font-semibold">BLOCKED</span>}
                    </p>
                    <p className="text-[11px] text-muted-foreground">{messages.length} message{messages.length !== 1 && 's'}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {selectedMsgIds.size > 0 && (
                      <>
                        <span className="text-[11px] text-muted-foreground mr-1">{selectedMsgIds.size} selected</span>
                        <Button variant="outline" size="sm" onClick={() => setConfirmDeleteMsgs('admin')} className="h-8 text-xs">
                          <Trash2 className="h-3 w-3 mr-1" /> For me
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => setConfirmDeleteMsgs('everyone')} className="h-8 text-xs">
                          <Trash2 className="h-3 w-3 mr-1" /> For everyone
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setSelectedMsgIds(new Set())}><X className="h-4 w-4" /></Button>
                      </>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => { if (currentConv) { setBlockDialog(currentConv); setBlockReason(currentConv.blocked_reason || ''); } }} title={currentConv?.blocked ? 'Unblock' : 'Block'}>
                      {currentConv?.blocked ? <ShieldOff className="h-4 w-4 text-destructive" /> : <Ban className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setConfirmDeleteConv(selectedId)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>

                <div ref={scrollRef} onScroll={onScroll} className="relative flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 space-y-1 max-h-[420px] bg-background/50">
                  {floatingDate && (
                    <div className="sticky top-2 z-10 flex items-start justify-center pointer-events-none h-0">
                      <span
                        className={cn(
                          'text-[10px] font-medium px-3 py-1 rounded-full bg-foreground/70 text-background shadow-md transition-all duration-300 ease-out',
                          dateVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1',
                        )}
                      >
                        {floatingDate}
                      </span>
                    </div>
                  )}
                  {visibleMsgs.map((m, i) => {
                    const prev = i > 0 ? visibleMsgs[i - 1] : null;
                    const newDay = isNewDay(m.created_at, prev?.created_at || null);
                    return (
                      <div key={m.id}>
                        {newDay && (
                          <div className="flex justify-center my-3">
                            <span className="text-[10px] font-medium px-3 py-1 rounded-full bg-muted text-muted-foreground border border-border">
                              {dayLabel(new Date(m.created_at))}
                            </span>
                          </div>
                        )}
                        <AdminChatRow
                          msg={m}
                          replyTarget={m.reply_to_id ? msgById.get(m.reply_to_id) || null : null}
                          isMine={m.sender === 'admin'}
                          selected={selectedMsgIds.has(m.id)}
                          selectMode={selectedMsgIds.size > 0}
                          onToggleSelect={() => toggleMsg(m.id)}
                          onEnterSelect={() => enterSelectWith(m.id)}
                          onReply={() => setReplyTo(m)}
                          workerId={selectedId}
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Reply/image preview */}
                {replyTo && (
                  <div className="px-3 py-2 border-t border-border bg-muted/40 flex items-center gap-2">
                    <div className="w-1 h-8 rounded bg-primary" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-semibold text-primary">Replying to {replyTo.sender === 'admin' ? 'yourself' : selectedId}</p>
                      <p className="text-xs text-muted-foreground truncate">{replyTo.body || (replyTo.image_url ? '📷 Photo' : '')}</p>
                    </div>
                    <button onClick={() => setReplyTo(null)} className="h-6 w-6 rounded hover:bg-muted flex items-center justify-center"><X className="h-3.5 w-3.5" /></button>
                  </div>
                )}
                {pendingImage && (
                  <div className="px-3 py-2 border-t border-border bg-muted/40 flex items-center gap-2">
                    <img src={pendingImage} alt="preview" className="h-12 w-12 rounded object-cover" />
                    <span className="flex-1 text-xs text-muted-foreground">Photo ready to send</span>
                    <button onClick={() => setPendingImage(null)} className="h-6 w-6 rounded hover:bg-muted flex items-center justify-center"><X className="h-3.5 w-3.5" /></button>
                  </div>
                )}

                <div className="p-2.5 border-t border-border flex items-end gap-2">
                  <input ref={fileRef} type="file" accept="image/*" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImagePick(f); e.target.value = ''; }} />
                  <Button variant="outline" size="icon" onClick={() => fileRef.current?.click()} disabled={uploading || sending} className="h-10 w-10 shrink-0">
                    <ImageIcon className="h-4 w-4" />
                  </Button>
                  <Textarea value={reply} onChange={(e) => setReply(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendReply(); } }}
                    rows={1} placeholder={uploading ? 'Uploading…' : 'Write a reply…'} className="min-h-[40px] max-h-32 text-sm" />
                  <Button onClick={handleSendReply} disabled={sending || uploading || (!reply.trim() && !pendingImage)} size="icon" className="h-10 w-10 shrink-0">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </CardContent>

      {/* Delete conversation confirm */}
      <AlertDialog open={!!confirmDeleteConv} onOpenChange={(o) => !o && setConfirmDeleteConv(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete entire conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes all messages with <strong>{confirmDeleteConv}</strong>. Cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmDeleteConv && handleDeleteConversation(confirmDeleteConv)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete messages confirm */}
      <AlertDialog open={!!confirmDeleteMsgs} onOpenChange={(o) => { if (!o && !deletingMsgs) setConfirmDeleteMsgs(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {selectedMsgIds.size} message{selectedMsgIds.size > 1 ? 's' : ''}{' '}
              {confirmDeleteMsgs === 'everyone' ? 'for everyone?' : 'for me?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDeleteMsgs === 'everyone'
                ? 'The user will see "This message was deleted" in place of each message.'
                : 'These messages will be hidden from your view. The user still sees them.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmDeleteMsgs && handleDeleteMessages(confirmDeleteMsgs)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Block dialog */}
      <Dialog open={!!blockDialog} onOpenChange={(o) => { if (!o) { setBlockDialog(null); setBlockReason(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{blockDialog?.blocked ? 'Unblock user?' : 'Block user from chat?'}</DialogTitle>
            <DialogDescription>
              {blockDialog?.blocked
                ? `${blockDialog?.worker_id} will be able to send messages again.`
                : `${blockDialog?.worker_id} will not be able to send new messages. You can unblock anytime.`}
            </DialogDescription>
          </DialogHeader>
          {!blockDialog?.blocked && (
            <Input placeholder="Reason (optional, shown to user)" value={blockReason} onChange={(e) => setBlockReason(e.target.value)} />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setBlockDialog(null)}>Cancel</Button>
            <Button variant={blockDialog?.blocked ? 'default' : 'destructive'} onClick={handleToggleBlock}>
              {blockDialog?.blocked ? 'Unblock' : 'Block'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Broadcast dialog */}
      <Dialog open={broadcastOpen} onOpenChange={(o) => { setBroadcastOpen(o); if (!o) { setBroadcastBody(''); setConfirmBroadcast(false); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Megaphone className="h-4 w-4" /> Broadcast to all users</DialogTitle>
            <DialogDescription>Sends this message as a chat to every user who has set a PIN.</DialogDescription>
          </DialogHeader>
          <Textarea rows={5} placeholder="Type your announcement…" value={broadcastBody} onChange={(e) => setBroadcastBody(e.target.value)} />
          {!confirmBroadcast ? (
            <DialogFooter>
              <Button variant="outline" onClick={() => setBroadcastOpen(false)}>Cancel</Button>
              <Button onClick={() => setConfirmBroadcast(true)} disabled={!broadcastBody.trim()}>Continue</Button>
            </DialogFooter>
          ) : (
            <>
              <div className="text-xs p-3 rounded-md bg-destructive/10 text-destructive border border-destructive/20">
                Confirm: send this message to every registered user? This cannot be undone.
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setConfirmBroadcast(false)}>Back</Button>
                <Button variant="destructive" onClick={handleBroadcast} disabled={broadcasting}>
                  {broadcasting ? 'Sending…' : 'Send to all'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function AdminChatRow({
  msg, replyTarget, isMine, selected, selectMode, onToggleSelect, onEnterSelect, onReply, workerId,
}: {
  msg: Msg; replyTarget: Msg | null; isMine: boolean;
  selected: boolean; selectMode: boolean;
  onToggleSelect: () => void; onEnterSelect: () => void; onReply: () => void; workerId: string;
}) {
  const { dx, swipeProgress, handlers } = useSwipeReply(selectMode ? () => {} : onReply, 'right');
  const deleted = msg.deleted_for === 'everyone';

  return (
    <div
      className={cn(
        'relative py-1 rounded-lg transition-colors duration-200 flex items-start gap-2',
        selectMode && 'cursor-pointer -mx-1 px-1',
        selected && 'bg-primary/10',
      )}
      style={{ touchAction: 'pan-y' }}
      onClick={selectMode ? onToggleSelect : undefined}
      {...(selectMode ? {} : handlers)}
    >
      {!selectMode && dx > 8 && (
        <div className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center" style={{ opacity: swipeProgress }}>
          <Reply className="h-4 w-4 text-primary" />
        </div>
      )}
      <div
        className={cn('flex flex-col max-w-[80%] flex-1', isMine ? 'ml-auto items-end' : 'mr-auto items-start')}
        style={{ transform: `translateX(${dx}px)`, transition: dx === 0 ? 'transform 0.2s ease' : 'none' }}
      >
        <div className="flex items-end gap-2">
          {selectMode && (
            <span
              className={cn(
                'shrink-0 mb-1 h-5 w-5 rounded-full border flex items-center justify-center transition-colors',
                selected ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/40 text-transparent',
                isMine ? 'order-2' : 'order-1',
              )}
            >
              <CheckSquare className="h-3 w-3" />
            </span>
          )}
          <div className={cn(
            'relative px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words',
            isMine ? 'bg-primary text-primary-foreground rounded-br-md order-1' : 'bg-muted text-foreground rounded-bl-md order-2',
            deleted && 'italic opacity-70',
          )}>
            {replyTarget && !deleted && (
              <div className={cn('mb-1.5 px-2 py-1 rounded-md border-l-2 text-[11px]',
                isMine ? 'bg-primary-foreground/10 border-primary-foreground/60' : 'bg-background/60 border-primary')}>
                <p className="font-semibold opacity-80 truncate">{replyTarget.sender === 'admin' ? 'You' : workerId}</p>
                <p className="opacity-70 truncate">{replyTarget.body || (replyTarget.image_url ? '📷 Photo' : '')}</p>
              </div>
            )}
            {deleted ? (
              <span className="text-xs">🚫 This message was deleted</span>
            ) : (
              <>
                {msg.image_url && <img src={msg.image_url} alt="attachment" className="rounded-md mb-1 max-h-56 object-cover" />}
                {msg.body}
              </>
            )}
          </div>
        </div>
        <div className={cn('flex items-center gap-2 mt-1 px-1', isMine && 'flex-row-reverse')}>
          <span data-msg-time={msg.created_at} className="text-[10px] text-muted-foreground">
            {isMine ? 'You' : workerId} · {new Date(msg.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </span>
          {!deleted && !selectMode && (
            <button
              onClick={(e) => { e.stopPropagation(); onEnterSelect(); }}
              className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-destructive transition-colors"
            >
              <Trash2 className="h-2.5 w-2.5" /> Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
