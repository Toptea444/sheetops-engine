// User-side live support chat.
// Actions: send_message, list_messages, mark_read, upload_image, delete_for_me
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const NOTIFY_EMAIL = 'cortexturptee@gmail.com';
const QUIET_PERIOD_MINUTES = 30;
const MAX_MESSAGE_LENGTH = 2000;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const SIGNED_URL_TTL = 60 * 60 * 24 * 30; // 30 days

// Rate limits
const MIN_INTERVAL_MS = 2_000;
const MAX_PER_MINUTE = 5;
const MAX_PER_HOUR = 40;
const MAX_PER_DAY = 150;
const DUPLICATE_WINDOW_MS = 60_000;

interface ChatBody {
  action: 'send_message' | 'list_messages' | 'mark_read' | 'upload_image' | 'delete_for_me';
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
  if (!resendKey) return;
  try {
    const preview = body.length > 200 ? body.slice(0, 200) + '…' : body;
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Bonus Tracker Support <onboarding@resend.dev>',
        to: [NOTIFY_EMAIL],
        subject: `New support message from ${workerId}`,
        html: `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:520px;padding:20px;color:#111"><h2 style="margin:0 0 8px;font-size:18px">New support message</h2><p style="color:#666;margin:0 0 16px;font-size:13px">From worker <strong>${workerId}</strong></p><div style="border-left:3px solid #3B82F6;padding:12px 14px;background:#F8FAFC;border-radius:6px;font-size:14px;line-height:1.5;white-space:pre-wrap">${preview.replace(/</g, '&lt;')}</div><p style="color:#888;margin:16px 0 0;font-size:12px">Reply from your admin dashboard → Support tab.</p></div>`,
      }),
    });
  } catch (e) { console.error('[support-chat] Email failed:', e); }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  let body: ChatBody;
  try { body = await req.json(); } catch { return bad('Invalid JSON body'); }

  const workerId = String(body.worker_id || '').trim().toUpperCase();
  if (!workerId) return bad('worker_id is required');

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: pinRow } = await supabase
    .from('worker_pins').select('id').eq('worker_id', workerId).maybeSingle();
  if (!pinRow) return bad('We could not verify your account. Please log in again.');

  const params: any = body.params || {};

  switch (body.action) {
    case 'send_message': {
      const messageBody = String(params.body || '').trim();
      const imageUrl = params.image_url ? String(params.image_url) : null;
      const replyToId = params.reply_to_id ? String(params.reply_to_id) : null;

      if (!messageBody && !imageUrl) return bad('Message cannot be empty');
      if (messageBody.length > MAX_MESSAGE_LENGTH) return bad(`Message too long (max ${MAX_MESSAGE_LENGTH})`);

      // Block check
      const { data: convBlock } = await supabase
        .from('support_conversations').select('blocked').eq('worker_id', workerId).maybeSingle();
      if (convBlock?.blocked) return bad('You cannot send messages right now. Please contact your admin.');

      // Rate limits (only for text; images still counted)
      const nowMs = Date.now();
      const dayAgo = new Date(nowMs - 86_400_000).toISOString();
      const { data: recent } = await supabase
        .from('support_messages')
        .select('body, created_at')
        .eq('worker_id', workerId).eq('sender', 'user')
        .gte('created_at', dayAgo)
        .order('created_at', { ascending: false }).limit(200);
      const list = recent || [];
      if (list.length >= MAX_PER_DAY) return bad('You have sent a lot of messages today. Try tomorrow.');
      const lastMs = list[0] ? new Date(list[0].created_at).getTime() : 0;
      if (lastMs && nowMs - lastMs < MIN_INTERVAL_MS) {
        return bad(`Slow down — wait ${Math.ceil((MIN_INTERVAL_MS - (nowMs - lastMs)) / 1000)}s.`);
      }
      if (list.filter(r => nowMs - new Date(r.created_at).getTime() < 60_000).length >= MAX_PER_MINUTE)
        return bad('Too many messages in a short time. Wait a minute.');
      if (list.filter(r => nowMs - new Date(r.created_at).getTime() < 3_600_000).length >= MAX_PER_HOUR)
        return bad('Too many messages this hour. Try later.');
      if (messageBody) {
        const bl = messageBody.toLowerCase();
        if (list.some(r => (r.body || '').trim().toLowerCase() === bl && nowMs - new Date(r.created_at).getTime() < DUPLICATE_WINDOW_MS))
          return bad('You just sent that message. Wait for a reply.');
        if ((messageBody.match(/https?:\/\//gi) || []).length > 3) return bad('Too many links.');
        if (/(.)\1{20,}/.test(messageBody)) return bad('Message looks like spam.');
      }

      const { data: msg, error: msgErr } = await supabase
        .from('support_messages')
        .insert({ worker_id: workerId, sender: 'user', body: messageBody, image_url: imageUrl, reply_to_id: replyToId })
        .select().single();
      if (msgErr) return bad(msgErr.message);

      const preview = imageUrl && !messageBody ? '📷 Photo' : (messageBody.length > 140 ? messageBody.slice(0, 140) + '…' : messageBody);
      const { data: existingConv } = await supabase
        .from('support_conversations')
        .select('last_admin_notified_at, unread_admin')
        .eq('worker_id', workerId).maybeSingle();
      const nowIso = new Date().toISOString();
      await supabase.from('support_conversations').upsert({
        worker_id: workerId, last_message_at: nowIso, last_sender: 'user',
        last_message_preview: preview, unread_admin: (existingConv?.unread_admin ?? 0) + 1,
      }, { onConflict: 'worker_id' });

      const lastNotifiedAt = existingConv?.last_admin_notified_at
        ? new Date(existingConv.last_admin_notified_at).getTime() : 0;
      if (Date.now() - lastNotifiedAt > QUIET_PERIOD_MINUTES * 60_000) {
        await supabase.from('support_conversations').update({ last_admin_notified_at: nowIso }).eq('worker_id', workerId);
        await sendEmailNotification(workerId, messageBody || '📷 Photo');
      }

      return ok({ success: true, message: msg });
    }

    case 'list_messages': {
      const { data, error } = await supabase
        .from('support_messages').select('*')
        .eq('worker_id', workerId)
        .order('created_at', { ascending: true }).limit(1000);
      if (error) return bad(error.message);
      // Filter out messages deleted-for-user by admin? Admin uses 'admin' hide for own view.
      // For user side: deleted_for='everyone' shows as placeholder; nothing hidden.
      const messages = data || [];
      const { data: conv } = await supabase
        .from('support_conversations').select('*')
        .eq('worker_id', workerId).maybeSingle();
      return ok({ success: true, messages, conversation: conv || null });
    }

    case 'mark_read': {
      await supabase.from('support_conversations').update({ unread_user: 0 }).eq('worker_id', workerId);
      await supabase.from('support_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('worker_id', workerId).eq('sender', 'admin').is('read_at', null);
      return ok({ success: true });
    }

    case 'upload_image': {
      const { data: convBlock } = await supabase
        .from('support_conversations').select('blocked').eq('worker_id', workerId).maybeSingle();
      if (convBlock?.blocked) return bad('You cannot send images right now.');

      const dataUrl = String(params.data_url || '');
      const match = /^data:(image\/(png|jpe?g|gif|webp));base64,(.+)$/i.exec(dataUrl);
      if (!match) return bad('Invalid image format (png/jpg/gif/webp only)');
      const mime = match[1];
      const ext = match[2].toLowerCase() === 'jpeg' ? 'jpg' : match[2].toLowerCase();
      const bytes = Uint8Array.from(atob(match[3]), c => c.charCodeAt(0));
      if (bytes.byteLength > MAX_IMAGE_BYTES) return bad('Image too large (max 5MB)');

      const path = `${workerId}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from('support-chat-images')
        .upload(path, bytes, { contentType: mime, upsert: false });
      if (upErr) return bad(upErr.message);
      const { data: signed } = await supabase.storage.from('support-chat-images')
        .createSignedUrl(path, SIGNED_URL_TTL);
      return ok({ success: true, image_url: signed?.signedUrl || path, path });
    }

    case 'delete_for_me': {
      // User hides one of their own messages from their own view.
      const messageId = String(params.message_id || '');
      if (!messageId) return bad('message_id required');
      const { error } = await supabase.from('support_messages')
        .update({ deleted_for: 'user', deleted_at: new Date().toISOString() })
        .eq('id', messageId).eq('worker_id', workerId).eq('sender', 'user');
      if (error) return bad(error.message);
      return ok({ success: true });
    }

    default:
      return bad('Unknown action');
  }
});
