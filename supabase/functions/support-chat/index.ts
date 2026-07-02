// User-side live support chat.
// Actions:
//   send_message  → append a message from the user, bump unread_admin,
//                   optionally send batched email notification to owner
//   list_messages → return message history for a worker
//   mark_read     → mark all admin messages as seen by the user (reset unread_user)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const NOTIFY_EMAIL = 'cortexturptee@gmail.com';
const QUIET_PERIOD_MINUTES = 30;
const MAX_MESSAGE_LENGTH = 2000;

// Rate limits / spam controls
const MIN_INTERVAL_MS = 2_000;           // 2s between messages
const MAX_PER_MINUTE  = 5;               // burst cap
const MAX_PER_HOUR    = 40;              // sustained cap
const MAX_PER_DAY     = 150;             // daily cap
const DUPLICATE_WINDOW_MS = 60_000;      // same body within 60s = blocked


interface ChatBody {
  action: 'send_message' | 'list_messages' | 'mark_read';
  worker_id?: string;
  params?: Record<string, unknown>;
}

function ok(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
function bad(message: string) {
  return ok({ success: false, error: message });
}

async function sendEmailNotification(workerId: string, body: string): Promise<void> {
  const resendKey = Deno.env.get('RESEND_API_KEY');
  if (!resendKey) {
    console.log('[support-chat] RESEND_API_KEY not set — skipping email notification');
    return;
  }
  try {
    const preview = body.length > 200 ? body.slice(0, 200) + '…' : body;
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Bonus Tracker Support <onboarding@resend.dev>',
        to: [NOTIFY_EMAIL],
        subject: `New support message from ${workerId}`,
        html: `
          <div style="font-family:system-ui,-apple-system,sans-serif;max-width:520px;padding:20px;color:#111">
            <h2 style="margin:0 0 8px;font-size:18px">New support message</h2>
            <p style="color:#666;margin:0 0 16px;font-size:13px">From worker <strong>${workerId}</strong></p>
            <div style="border-left:3px solid #3B82F6;padding:12px 14px;background:#F8FAFC;border-radius:6px;font-size:14px;line-height:1.5;white-space:pre-wrap">${preview.replace(/</g, '&lt;')}</div>
            <p style="color:#888;margin:16px 0 0;font-size:12px">Reply from your admin dashboard → Support tab.</p>
          </div>
        `,
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      console.error('[support-chat] Resend error:', res.status, t);
    }
  } catch (e) {
    console.error('[support-chat] Email notification failed:', e);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  let body: ChatBody;
  try {
    body = await req.json();
  } catch {
    return bad('Invalid JSON body');
  }

  const workerId = String(body.worker_id || '').trim().toUpperCase();
  if (!workerId) return bad('worker_id is required');

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Verify worker has a PIN (i.e. is a real user)
  const { data: pinRow } = await supabase
    .from('worker_pins')
    .select('id')
    .eq('worker_id', workerId)
    .maybeSingle();
  if (!pinRow) return bad('We could not verify your account. Please log in again.');

  const params: any = body.params || {};

  switch (body.action) {
    case 'send_message': {
      const messageBody = String(params.body || '').trim();
      if (!messageBody) return bad('Message cannot be empty');
      if (messageBody.length > MAX_MESSAGE_LENGTH) return bad(`Message is too long (max ${MAX_MESSAGE_LENGTH} chars)`);

      // ---------- Rate limiting / spam controls ----------
      const nowMs = Date.now();
      const dayAgo = new Date(nowMs - 24 * 60 * 60 * 1000).toISOString();
      const { data: recent } = await supabase
        .from('support_messages')
        .select('body, created_at')
        .eq('worker_id', workerId)
        .eq('sender', 'user')
        .gte('created_at', dayAgo)
        .order('created_at', { ascending: false })
        .limit(200);

      const recentList = recent || [];
      if (recentList.length >= MAX_PER_DAY) {
        return bad('You have sent a lot of messages today. Please try again tomorrow.');
      }
      const lastMs = recentList[0] ? new Date(recentList[0].created_at).getTime() : 0;
      if (lastMs && nowMs - lastMs < MIN_INTERVAL_MS) {
        const wait = Math.ceil((MIN_INTERVAL_MS - (nowMs - lastMs)) / 1000);
        return bad(`Slow down a bit — wait ${wait}s before sending again.`);
      }
      const inLastMin = recentList.filter((r) => nowMs - new Date(r.created_at).getTime() < 60_000).length;
      if (inLastMin >= MAX_PER_MINUTE) {
        return bad('Too many messages in a short time. Please wait a minute.');
      }
      const inLastHour = recentList.filter((r) => nowMs - new Date(r.created_at).getTime() < 60 * 60_000).length;
      if (inLastHour >= MAX_PER_HOUR) {
        return bad('You have sent too many messages this hour. Please try again later.');
      }
      // Duplicate content check
      const bodyLower = messageBody.toLowerCase();
      const isDup = recentList.some((r) =>
        (r.body || '').trim().toLowerCase() === bodyLower &&
        nowMs - new Date(r.created_at).getTime() < DUPLICATE_WINDOW_MS,
      );
      if (isDup) return bad('You just sent that message. Please wait for a reply.');
      // Simple spam heuristic: link flood + very long repeat char runs
      if ((messageBody.match(/https?:\/\//gi) || []).length > 3) {
        return bad('Too many links in one message.');
      }
      if (/(.)\1{20,}/.test(messageBody)) {
        return bad('Message looks like spam.');
      }
      // ---------- end rate limits ----------

      const { data: msg, error: msgErr } = await supabase
        .from('support_messages')
        .insert({ worker_id: workerId, sender: 'user', body: messageBody })
        .select()
        .single();
      if (msgErr) return bad(msgErr.message);


      // Upsert conversation state
      const preview = messageBody.length > 140 ? messageBody.slice(0, 140) + '…' : messageBody;
      const { data: existingConv } = await supabase
        .from('support_conversations')
        .select('last_admin_notified_at, unread_admin')
        .eq('worker_id', workerId)
        .maybeSingle();

      const nowIso = new Date().toISOString();
      const newUnread = (existingConv?.unread_admin ?? 0) + 1;

      await supabase
        .from('support_conversations')
        .upsert({
          worker_id: workerId,
          last_message_at: nowIso,
          last_sender: 'user',
          last_message_preview: preview,
          unread_admin: newUnread,
        }, { onConflict: 'worker_id' });

      // Decide whether to send email: quiet-period batching.
      // Send email if never notified OR last notify was > QUIET_PERIOD_MINUTES ago.
      const lastNotifiedAt = existingConv?.last_admin_notified_at
        ? new Date(existingConv.last_admin_notified_at).getTime()
        : 0;
      const quietMs = QUIET_PERIOD_MINUTES * 60 * 1000;
      const shouldNotify = Date.now() - lastNotifiedAt > quietMs;

      if (shouldNotify) {
        // Fire-and-forget email; update timestamp regardless so retries don't spam
        await supabase
          .from('support_conversations')
          .update({ last_admin_notified_at: nowIso })
          .eq('worker_id', workerId);
        // Don't await email fully to keep response snappy, but we're in a
        // short-lived edge fn — awaiting is fine and gives us the log.
        await sendEmailNotification(workerId, messageBody);
      }

      return ok({ success: true, message: msg });
    }

    case 'list_messages': {
      const { data, error } = await supabase
        .from('support_messages')
        .select('*')
        .eq('worker_id', workerId)
        .order('created_at', { ascending: true })
        .limit(500);
      if (error) return bad(error.message);
      const { data: conv } = await supabase
        .from('support_conversations')
        .select('*')
        .eq('worker_id', workerId)
        .maybeSingle();
      return ok({ success: true, messages: data || [], conversation: conv || null });
    }

    case 'mark_read': {
      // User has now seen all admin messages — reset unread_user
      await supabase
        .from('support_conversations')
        .update({ unread_user: 0 })
        .eq('worker_id', workerId);
      await supabase
        .from('support_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('worker_id', workerId)
        .eq('sender', 'admin')
        .is('read_at', null);
      return ok({ success: true });
    }

    default:
      return bad('Unknown action');
  }
});
