import { useEffect, useMemo, useRef, useState } from 'react';
import { MessageCircle, X, Send, HeadphonesIcon, Reply, Image as ImageIcon, Ban, Trash2, CornerUpLeft } from 'lucide-react';
import { useSupportChat, type SupportMessage } from '@/hooks/useSupportChat';
import { useSwipeReply } from '@/hooks/useSwipeReply';
import { dayLabel, isNewDay, startOfDay } from '@/lib/chatDates';
import { cn } from '@/lib/utils';

interface Props { workerId: string | null }

export function SupportFAB({ workerId }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [replyTo, setReplyTo] = useState<SupportMessage | null>(null);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [floatingDate, setFloatingDate] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const {
    messages, unreadCount, isSending, isUploading, isBlocked, conversation,
    error, send, uploadImage, deleteForMe, markRead,
  } = useSupportChat(workerId);

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    });
  }, [messages.length, open]);

  useEffect(() => { if (open && unreadCount > 0) markRead(); }, [open, unreadCount, markRead]);
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 200); }, [open]);

  const visible = useMemo(() => messages.filter((m) => m.deleted_for !== 'user'), [messages]);
  const msgById = useMemo(() => {
    const m = new Map<string, SupportMessage>();
    messages.forEach((x) => m.set(x.id, x));
    return m;
  }, [messages]);

  // Floating date pill on scroll
  const onScroll = () => {
    const el = scrollRef.current; if (!el) return;
    const rows = el.querySelectorAll<HTMLElement>('[data-msg-time]');
    let firstVisible: HTMLElement | null = null;
    const topBound = el.getBoundingClientRect().top;
    for (const r of Array.from(rows)) {
      if (r.getBoundingClientRect().bottom >= topBound + 4) { firstVisible = r; break; }
    }
    if (firstVisible) {
      const t = firstVisible.getAttribute('data-msg-time');
      if (t) {
        setFloatingDate(dayLabel(new Date(t)));
        if (hideTimer.current) clearTimeout(hideTimer.current);
        hideTimer.current = setTimeout(() => setFloatingDate(null), 1200);
      }
    }
  };

  const handleImagePick = async (file: File) => {
    const url = await uploadImage(file);
    if (url) setPendingImage(url);
  };

  const handleSend = async () => {
    if (isBlocked) return;
    if (!draft.trim() && !pendingImage) return;
    const ok = await send(draft, { reply_to_id: replyTo?.id ?? null, image_url: pendingImage });
    if (ok) { setDraft(''); setReplyTo(null); setPendingImage(null); }
  };

  if (!workerId) return null;

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close support chat' : 'Open support chat'}
        className={cn(
          'fixed z-[95] bottom-5 right-5 h-16 w-16 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 active:scale-95',
          open ? 'bg-muted text-foreground rotate-90' : 'bg-primary text-primary-foreground hover:scale-105',
        )}
      >
        {open ? <X className="h-7 w-7" /> : <MessageCircle className="h-7 w-7" />}
        {!open && unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[24px] h-6 rounded-full bg-red-500 text-white text-[12px] font-bold flex items-center justify-center px-2 border-2 border-background animate-in zoom-in-50">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className={cn(
          'fixed z-[95] bottom-24 right-4 left-4 sm:left-auto sm:right-5 sm:w-[380px] max-h-[calc(100vh-8rem)] flex flex-col',
          'bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-300',
        )}>
          <div className="px-4 py-3 border-b border-border bg-muted/40 flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <HeadphonesIcon className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground leading-tight">Chat with Adelaja</p>
              <p className="text-[11px] text-muted-foreground leading-tight">
                {isBlocked ? 'Chat disabled' : 'Ask me anything about the app'}
              </p>
            </div>
            <button onClick={() => setOpen(false)} className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground" aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div ref={scrollRef} onScroll={onScroll} className="relative flex-1 overflow-y-auto px-3 py-4 space-y-1 max-h-[360px] bg-background/50">
            {floatingDate && (
              <div className="sticky top-0 z-10 flex justify-center pointer-events-none">
                <span className="text-[10px] font-medium px-3 py-1 rounded-full bg-foreground/70 text-background shadow-md animate-in fade-in duration-150">
                  {floatingDate}
                </span>
              </div>
            )}
            {visible.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-6 py-10">
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                  <MessageCircle className="h-6 w-6 text-primary" />
                </div>
                <p className="text-sm font-medium text-foreground">Say hi 👋</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Send me a message and I'll reply as soon as I can.
                </p>
              </div>
            ) : visible.map((m, i) => {
              const prev = i > 0 ? visible[i - 1] : null;
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
                  <ChatRow
                    msg={m}
                    replyTarget={m.reply_to_id ? msgById.get(m.reply_to_id) || null : null}
                    isMine={m.sender === 'user'}
                    onReply={() => { if (!isBlocked) setReplyTo(m); inputRef.current?.focus(); }}
                    onDelete={m.sender === 'user' && m.deleted_for !== 'everyone' ? () => deleteForMe(m.id) : undefined}
                  />
                </div>
              );
            })}
          </div>

          {error && (
            <div className="px-3 py-2 text-[11px] text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border-t border-red-200 dark:border-red-900">
              {error}
            </div>
          )}

          {isBlocked ? (
            <div className="border-t border-border p-4 bg-muted/40 flex items-center gap-2 text-xs text-muted-foreground">
              <Ban className="h-4 w-4 text-destructive" />
              <span>{conversation?.blocked_reason || 'You have been blocked from sending messages.'}</span>
            </div>
          ) : (
            <>
              {replyTo && (
                <div className="px-3 py-2 border-t border-border bg-muted/40 flex items-center gap-2">
                  <div className="w-1 h-8 rounded bg-primary" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-semibold text-primary">Replying to {replyTo.sender === 'user' ? 'yourself' : 'Adelaja'}</p>
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
              <div className="border-t border-border p-2.5 bg-card flex items-end gap-2">
                <input
                  ref={fileRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImagePick(f); e.target.value = ''; }}
                />
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={isUploading || isSending}
                  className="h-10 w-10 rounded-xl bg-muted text-muted-foreground hover:bg-muted/80 flex items-center justify-center shrink-0 disabled:opacity-40"
                  aria-label="Attach image"
                >
                  <ImageIcon className="h-4 w-4" />
                </button>
                <textarea
                  ref={inputRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  rows={1}
                  placeholder={isUploading ? 'Uploading photo…' : 'Type a message…'}
                  disabled={isUploading}
                  className="flex-1 resize-none max-h-32 min-h-[40px] px-3 py-2 rounded-xl border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  onClick={handleSend}
                  disabled={(!draft.trim() && !pendingImage) || isSending || isUploading}
                  className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
                  aria-label="Send"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}

function ChatRow({
  msg, replyTarget, isMine, onReply, onDelete,
}: {
  msg: SupportMessage;
  replyTarget: SupportMessage | null;
  isMine: boolean;
  onReply: () => void;
  onDelete?: () => void;
}) {
  const { dx, swipeProgress, handlers } = useSwipeReply(onReply, 'right');
  const deleted = msg.deleted_for === 'everyone';

  return (
    <div className="relative py-1 group" {...handlers}>
      {/* Swipe reply hint icon */}
      {dx > 8 && (
        <div className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center"
          style={{ opacity: swipeProgress }}>
          <Reply className="h-4 w-4 text-primary" />
        </div>
      )}
      <div
        className={cn('flex flex-col max-w-[80%]', isMine ? 'ml-auto items-end' : 'mr-auto items-start')}
        style={{ transform: `translateX(${dx}px)`, transition: dx === 0 ? 'transform 0.2s ease' : 'none' }}
      >
        <div className={cn(
          'relative px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words',
          isMine ? 'bg-primary text-primary-foreground rounded-br-md' : 'bg-muted text-foreground rounded-bl-md',
          deleted && 'italic opacity-70',
        )}>
          {replyTarget && !deleted && (
            <div className={cn(
              'mb-1.5 px-2 py-1 rounded-md border-l-2 text-[11px]',
              isMine ? 'bg-primary-foreground/10 border-primary-foreground/60' : 'bg-background/60 border-primary',
            )}>
              <p className="font-semibold opacity-80 truncate">{replyTarget.sender === 'user' ? 'You' : 'Adelaja'}</p>
              <p className="opacity-70 truncate">{replyTarget.body || (replyTarget.image_url ? '📷 Photo' : '')}</p>
            </div>
          )}
          {deleted ? (
            <span className="text-xs">🚫 This message was deleted</span>
          ) : (
            <>
              {msg.image_url && (
                <img src={msg.image_url} alt="attachment" className="rounded-md mb-1 max-h-56 object-cover" />
              )}
              {msg.body}
            </>
          )}
          {/* Desktop hover reply button */}
          {!deleted && (
            <button
              onClick={onReply}
              aria-label="Reply"
              className={cn(
                'hidden group-hover:flex absolute -top-2 h-6 w-6 rounded-full bg-background border border-border shadow items-center justify-center hover:bg-muted',
                isMine ? '-left-8' : '-right-8',
              )}
            >
              <CornerUpLeft className="h-3 w-3" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1 px-1">
          <span data-msg-time={msg.created_at} className="text-[10px] text-muted-foreground">
            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            {!isMine && ' · Adelaja'}
          </span>
          {onDelete && !deleted && (
            <button onClick={onDelete} className="hidden group-hover:inline-flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-destructive">
              <Trash2 className="h-2.5 w-2.5" /> Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
