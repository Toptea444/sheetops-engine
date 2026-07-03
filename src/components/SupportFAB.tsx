import { useEffect, useMemo, useRef, useState } from 'react';
import { MessageCircle, X, Send, HeadphonesIcon, Reply, Image as ImageIcon, Ban, Trash2, Check, CheckCheck, Loader2, Hand } from 'lucide-react';
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
  const [dateVisible, setDateVisible] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [dialogClosing, setDialogClosing] = useState(false);
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
        setDateVisible(true);
        if (hideTimer.current) clearTimeout(hideTimer.current);
        hideTimer.current = setTimeout(() => setDateVisible(false), 1400);
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

  const enterSelect = (id: string) => {
    setReplyTo(null);
    setSelectMode(true);
    setSelectedIds(new Set([id]));
  };
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };
  const exitSelect = () => { setSelectMode(false); setSelectedIds(new Set()); setConfirmDelete(false); };
  const deleteSelected = async () => {
    if (deleting) return;
    setDeleting(true);
    const ids = Array.from(selectedIds);
    for (const id of ids) await deleteForMe(id);
    setDeleting(false);
    setDialogClosing(true);
    setTimeout(() => { setDialogClosing(false); exitSelect(); }, 200);
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
        <div
          className="fixed inset-0 z-[94] bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-200"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

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

          {selectMode && (
            <div className="px-3 py-2 border-b border-border bg-muted/50 flex items-center gap-2 animate-in slide-in-from-top-2 fade-in duration-200">
              <button onClick={exitSelect} className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground" aria-label="Cancel selection">
                <X className="h-4 w-4" />
              </button>
              <span className="flex-1 text-xs font-medium text-foreground">
                {selectedIds.size} selected
              </span>
              <button
                onClick={() => selectedIds.size > 0 && setConfirmDelete(true)}
                disabled={selectedIds.size === 0}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-destructive/10 text-destructive text-xs font-semibold hover:bg-destructive/20 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
            </div>
          )}

          <div ref={scrollRef} onScroll={onScroll} className="relative flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 space-y-1 max-h-[360px] bg-background/50">
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
            {visible.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-6 py-10">
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                  <Hand className="h-6 w-6 text-primary" />
                </div>
                <p className="text-sm font-medium text-foreground">Say hi</p>
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
                    onDelete={m.sender === 'user' && m.deleted_for !== 'everyone' ? () => enterSelect(m.id) : undefined}
                    selectMode={selectMode}
                    selected={selectedIds.has(m.id)}
                    onToggleSelect={() => toggleSelect(m.id)}
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
                    <p className="text-xs text-muted-foreground truncate flex items-center gap-1">{replyTo.body || (replyTo.image_url ? (<><ImageIcon className="h-3 w-3" /> Photo</>) : '')}</p>
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

          {confirmDelete && (
            <div className={cn(
              'absolute inset-0 z-30 flex items-center justify-center bg-background/60 backdrop-blur-sm duration-200',
              dialogClosing ? 'animate-out fade-out' : 'animate-in fade-in',
            )}>
              <div className={cn(
                'mx-6 w-full max-w-[260px] rounded-2xl border border-border bg-card p-4 shadow-2xl duration-200',
                dialogClosing ? 'animate-out zoom-out-95 fade-out' : 'animate-in zoom-in-95',
              )}>
                <p className="text-sm font-semibold text-foreground">
                  Delete {selectedIds.size} message{selectedIds.size > 1 ? 's' : ''}?
                </p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  This removes {selectedIds.size > 1 ? 'them' : 'it'} from your chat only.
                </p>
                <div className="flex justify-end gap-2 mt-4">
                  <button
                    onClick={() => setConfirmDelete(false)}
                    disabled={deleting}
                    className="h-9 px-3 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted active:scale-95 transition-all disabled:opacity-40"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={deleteSelected}
                    disabled={deleting}
                    className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-destructive text-destructive-foreground text-xs font-semibold hover:opacity-90 active:scale-95 transition-all disabled:opacity-90 disabled:cursor-wait"
                  >
                    {deleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {deleting ? 'Deleting' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

function ChatRow({
  msg, replyTarget, isMine, onReply, onDelete, selectMode, selected, onToggleSelect,
}: {
  msg: SupportMessage;
  replyTarget: SupportMessage | null;
  isMine: boolean;
  onReply: () => void;
  onDelete?: () => void;
  selectMode: boolean;
  selected: boolean;
  onToggleSelect: () => void;
}) {
  const { dx, swipeProgress, handlers } = useSwipeReply(selectMode ? () => {} : onReply, 'right');
  const deleted = msg.deleted_for === 'everyone';

  return (
    <div
      className={cn(
        'relative py-1 rounded-lg transition-colors duration-200',
        selectMode && 'cursor-pointer -mx-1 px-1',
        selected && 'bg-primary/10',
      )}
      style={{ touchAction: 'pan-y' }}
      onClick={selectMode ? onToggleSelect : undefined}
      {...(selectMode ? {} : handlers)}
    >
      {/* Swipe reply hint icon */}
      {!selectMode && dx > 8 && (
        <div className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center"
          style={{ opacity: swipeProgress }}>
          <Reply className="h-4 w-4 text-primary" />
        </div>
      )}
      <div
        className={cn('flex flex-col max-w-[80%]', isMine ? 'ml-auto items-end' : 'mr-auto items-start')}
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
              <Check className="h-3 w-3" />
            </span>
          )}
          <div className={cn(
            'relative px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words',
            isMine ? 'bg-primary text-primary-foreground rounded-br-md order-1' : 'bg-muted text-foreground rounded-bl-md order-2',
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
          </div>
        </div>
        <div className="flex items-center gap-2 mt-1 px-1">
          <span data-msg-time={msg.created_at} className="text-[10px] text-muted-foreground">
            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            {!isMine && ' · Adelaja'}
          </span>
          {onDelete && !deleted && !selectMode && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
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
