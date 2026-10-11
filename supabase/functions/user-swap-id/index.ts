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

  // 1. Verify current PIN
  const { data: pinRow } = await supabase.from('worker_pins').select('pin_hash').eq('worker_id', oldId).maybeSingle();
  if (!pinRow) return bad('We could not verify your account. Please log in again.');
  if ((await hashPin(pin, oldId)) !== pinRow.pin_hash) return bad('Wrong PIN. Please try again.');

  // 2. New ID must not be actively used by someone else
  const { data: newPin } = await supabase.from('worker_pins').select('id').eq('worker_id', newId).maybeSingle();
  if (newPin) {
    const { data: movedAway } = await supabase
      .from('id_swaps').select('id').eq('old_worker_id', newId).limit(1);
    if (!movedAway || movedAway.length === 0) {
      return bad(`Someone is already using ${newId} on this app. If it is truly yours, please message admin through Support.`);
    }
  }

  // 3. Block duplicates
  const { data: dup } = await supabase
    .from('id_swaps').select('id').eq('old_worker_id', oldId).eq('new_worker_id', newId).limit(1);
  if (dup && dup.length > 0) return bad(`You already moved from ${oldId} to ${newId}.`);

  // 4. Record the swap
  const { data: swap, error } = await supabase.from('id_swaps').insert({
    worker_name: oldId,
    old_worker_id: oldId,
    new_worker_id: newId,
    effective_date: effectiveDate,
    cycle_key: cycleKey,
    notes: note,
    created_by: `user:${oldId}`,
  }).select().single();
  if (error) return bad(error.message);

  // 5. Carry the PIN over to the new ID, retire the old one
  await supabase.from('worker_pins').delete().eq('worker_id', newId);
  const { error: pinErr } = await supabase.from('worker_pins').insert({ worker_id: newId, pin_hash: await hashPin(pin, newId) });
  if (pinErr) {
    await supabase.from('id_swaps').delete().eq('id', swap.id);
    return bad('Could not move your PIN. Nothing was changed, please try again.');
  }
  await supabase.from('worker_pins').delete().eq('worker_id', oldId);
  await supabase.from('worker_sessions').delete().eq('worker_id', oldId);

  await supabase.from('audit_logs').insert({
    action: 'user_swap_id',
    actor: oldId,
    details: { old_worker_id: oldId, new_worker_id: newId, effective_date: effectiveDate, cycle_key: cycleKey },
    target_type: 'swap',
    target_id: swap.id,
  });

  return ok({ success: true, swap });
});
