// Lets a logged-in worker move their account to a new Worker ID by themselves.
// Verifies their current PIN, records a directional swap (old → new) in
// `id_swaps`, and carries the same PIN over to the new ID.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

async function hashPin(pin: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(pin + salt);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

const ok = (body: unknown) =>
  new Response(JSON.stringify(body), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
const bad = (error: string) => ok({ success: false, error });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  let body: any;
  try { body = await req.json(); } catch { return bad('Invalid request'); }

  const oldId = String(body.worker_id || '').trim().toUpperCase();
  const newId = String(body.new_worker_id || '').trim().toUpperCase();
  const pin = String(body.pin || '');
  const effectiveDate = String(body.effective_date || '').trim();
  const cycleKey = String(body.cycle_key || '').trim();
  const note = String(body.note || '').trim().slice(0, 300) || null;

  if (!oldId || !newId || !pin || !effectiveDate || !cycleKey) return bad('Please fill in everything.');
  if (oldId === newId) return bad('Your new ID is the same as your current ID.');
  if (!/^NGDS-?[A-Z0-9-]{2,20}$/.test(newId)) return bad('That new ID does not look right. It should start with NGDS.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveDate)) return bad('Please pick a valid date.');

  // Date must be within the last ~70 days and not in the future (allow +1 day for timezones)
  const eff = new Date(effectiveDate + 'T12:00:00Z').getTime();
  const now = Date.now();
  if (eff > now + 36 * 3600_000) return bad('The date cannot be in the future.');
  if (eff < now - 70 * 86400_000) return bad('That date is too far back. Please contact admin for older changes.');

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  // Record the move and carry the PIN in one database transaction. Occupied
  // destinations must be handled as admin-approved two-person exchanges.
  const { data: swap, error } = await supabase.rpc('user_record_id_move', {
    p_old_id: oldId,
    p_new_id: newId,
    p_old_hash: await hashPin(pin, oldId),
    p_new_hash: await hashPin(pin, newId),
    p_date: effectiveDate,
    p_cycle: cycleKey,
    p_notes: note || '',
  });
  if (error || !swap) {
    const known = error?.message || '';
    if (known.includes('already has an account') || known.includes('Could not verify') || known.includes('An ID change already involves')) return bad(known);
    return bad('Could not complete the ID move. Nothing was changed; please try again or contact Support.');
  }

  await supabase.from('audit_logs').insert({
    action: 'user_swap_id',
    actor: oldId,
    details: { old_worker_id: oldId, new_worker_id: newId, effective_date: effectiveDate, cycle_key: cycleKey },
    target_type: 'swap',
    target_id: swap.id,
  });

  return ok({ success: true, swap });
});
