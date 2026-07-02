import { useEffect, useRef, useState } from 'react';
import { MessageCircle, X, Send, HeadphonesIcon } from 'lucide-react';
import { useSupportChat } from '@/hooks/useSupportChat';
import { cn } from '@/lib/utils';

interface Props {
  workerId: string | null;
}

/**
 * Floating live-support widget.
 * Bottom-right FAB → click opens a mini chat panel with history,
 * realtime updates, and an unread badge when admin has replied.
 */
export function SupportFAB({ workerId }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { messages, unreadCount, isSending, error, send, markRead } = useSupportChat(workerId);

  // Auto-scroll to bottom whenever messages change or panel opens
  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    });
  }, [messages, open]);

  // When user opens the panel with unread admin messages, mark them read
  useEffect(() => {
    if (open && unreadCount > 0) markRead();
  }, [open, unreadCount, markRead]);

  // Focus textarea on open
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 200);
  }, [open]);

  const handleSend = async () => {
    if (!draft.trim() || isSending) return;
    const ok = await send(draft);
    if (ok) setDraft('');
  };

  if (!workerId) return null;

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close support chat' : 'Open support chat'}
        className={cn(
          'fixed z-[95] bottom-5 right-5 h-16 w-16 rounded-full shadow-lg flex items-center justify-center',
          'transition-all duration-300 active:scale-95',
          open
            ? 'bg-muted text-foreground rotate-90'
            : 'bg-primary text-primary-foreground hover:scale-105',
        )}
      >
        {open ? <X className="h-7 w-7" /> : <MessageCircle className="h-7 w-7" />}
        {!open && unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[24px] h-6 rounded-full bg-red-500 text-white text-[12px] font-bold flex items-center justify-center px-2 border-2 border-background animate-in zoom-in-50">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Chat Panel */}
      {open && (
        <div
          className={cn(
            'fixed z-[95] bottom-24 right-4 left-4 sm:left-auto sm:right-5 sm:w-[380px]',
            'max-h-[calc(100vh-8rem)] flex flex-col',
            'bg-card border border-border rounded-2xl shadow-2xl overflow-hidden',
            'animate-in slide-in-from-bottom-4 fade-in duration-300',
          )}
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-border bg-muted/40 flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <HeadphonesIcon className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground leading-tight">Chat with Adelaja</p>
              <p className="text-[11px] text-muted-foreground leading-tight">Ask me anything about the app</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-4 space-y-3 max-h-[320px] bg-background/50">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-6 py-10">
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                  <MessageCircle className="h-6 w-6 text-primary" />
                </div>
                <p className="text-sm font-medium text-foreground">Say hi 👋</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Send me a message and I'll reply as soon as I can.
                </p>
              </div>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    'flex flex-col max-w-[80%]',
                    m.sender === 'user' ? 'ml-auto items-end' : 'mr-auto items-start',
                  )}
                >
                  <div
                    className={cn(
                      'px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words',
                      m.sender === 'user'
                        ? 'bg-primary text-primary-foreground rounded-br-md'
                        : 'bg-muted text-foreground rounded-bl-md',
                    )}
                  >
                    {m.body}
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-1 px-1">
                    {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {m.sender === 'admin' && ' · Adelaja'}
                  </span>
                </div>
              ))
            )}
          </div>

          {error && (
            <div className="px-3 py-2 text-[11px] text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border-t border-red-200 dark:border-red-900">
              {error}
            </div>
          )}

          {/* Composer */}
          <div className="border-t border-border p-2.5 bg-card flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              rows={1}
              placeholder="Type a message…"
              className="flex-1 resize-none max-h-32 min-h-[40px] px-3 py-2 rounded-xl border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              onClick={handleSend}
              disabled={!draft.trim() || isSending}
              className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all"
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
