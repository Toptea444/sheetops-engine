// User-initiated earnings adjustments (deductions + additions).
// Each user can mark a day as "not worked" (deduction) or claim a day they worked
// on behalf of another worker (addition).
//
// Stored in the existing `day_transfers` table with:
//   kind = 'user_deduction' | 'user_addition'
//   created_by_user_id = worker_id of the user who made the change
//
// Deduction: source_worker_id = self, target_worker_id = '__SELF_DEDUCT__'
//            (sentinel that won't match anyone — only the source-side debit applies)
// Addition:  source_worker_id = other_id, target_worker_id = self
//            (existing transfer logic credits self and debits other)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SELF_DEDUCT_SENTINEL = '__SELF_DEDUCT__';

interface AdjustBody {
  action: 'create_deduction' | 'create_addition' | 'list_my_adjustments' | 'delete_my_adjustment';
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let body: AdjustBody;
  try {
    body = await req.json();
  } catch {
    return bad('Invalid JSON body');
  }

  const action = body.action;
  const workerId = String(body.worker_id || '').trim().toUpperCase();
  const params: any = body.params || {};

  if (!workerId) return bad('worker_id is required');

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Lightweight gate: confirm this worker has set up a PIN (i.e. is a real
  // confirmed user). The PIN flow on the client is the actual authentication
  // gate; this just blocks calls from completely unknown worker_ids.
  //
  // We intentionally do NOT check `worker_sessions.last_heartbeat` here:
  // on mobile, the heartbeat setInterval pauses when the screen sleeps, so the
  // row can go stale within minutes even though the user is actively on the
  // page — that was producing spurious "Session expired" errors when opening
  // the modal or submitting an adjustment.
  const { data: pinRow } = await supabase
    .from('worker_pins')
    .select('id')
    .eq('worker_id', workerId)
    .maybeSingle();

  if (!pinRow) {
    return bad('We could not verify your account. Please log in again.');
  }


  switch (action) {
    case 'create_deduction': {
      const date = String(params.date || '').trim();
      const cycleKey = String(params.cycle_key || '').trim();
      const sheetAmounts = (params.sheet_amounts && typeof params.sheet_amounts === 'object')
        ? params.sheet_amounts as Record<string, number>
        : {};
      const reason = String(params.reason || '').trim() || null;

      if (!date || !cycleKey) return bad('date and cycle_key are required');
      const total = Object.values(sheetAmounts).reduce((s, v) => s + (Number(v) || 0), 0);
      if (total <= 0) return bad('Nothing to deduct — no earnings found on this date.');

      // Block duplicate self-deduction on the same date
      const { data: existing } = await supabase
        .from('day_transfers')
        .select('id')
        .eq('created_by_user_id', workerId)
        .eq('source_worker_id', workerId)
        .eq('transfer_date', date)
        .eq('kind', 'user_deduction')
        .maybeSingle();
      if (existing) return bad('You already marked this date as not worked.');

      // Smart merge: if someone has already claimed they worked for you on this
      // date (a user_addition with source = self), the money has already been
      // moved off your account — no need (and no way) to deduct it again.
      const { data: alreadyClaimed } = await supabase
        .from('day_transfers')
        .select('id, target_worker_id, created_by_user_id')
        .eq('source_worker_id', workerId)
        .eq('transfer_date', date)
        .eq('kind', 'user_addition')
        .maybeSingle();
      if (alreadyClaimed) {
        return bad(`${alreadyClaimed.created_by_user_id || alreadyClaimed.target_worker_id} has already claimed they worked for you on this date, so the earnings were moved off your account. There is nothing more to deduct.`);
      }

      const { data, error } = await supabase
        .from('day_transfers')
        .insert({
          source_worker_id: workerId,
          target_worker_id: SELF_DEDUCT_SENTINEL,
          transfer_date: date,
          sheet_name: Object.keys(sheetAmounts).join(', ') || 'all',
          amount: total,
          bonus_amount: 0,
          ranking_bonus_amount: 0,
          cycle_key: cycleKey,
          reason,
          sheet_amounts: sheetAmounts,
          created_by_user_id: workerId,
          created_by: workerId,
          kind: 'user_deduction',
        })
        .select()
        .single();

      if (error) return bad(error.message);

      await supabase.from('audit_logs').insert({
        action: 'user_create_deduction',
        actor: workerId,
        target_type: 'transfer',
        target_id: data?.id,
        details: { date, total, sheet_amounts: sheetAmounts },
      });

      return ok({ success: true, adjustment: data });
    }

    case 'create_addition': {
      const sourceId = String(params.source_worker_id || '').trim().toUpperCase();
      const date = String(params.date || '').trim();
      const cycleKey = String(params.cycle_key || '').trim();
      const sheetAmounts = (params.sheet_amounts && typeof params.sheet_amounts === 'object')
        ? params.sheet_amounts as Record<string, number>
        : {};
      const reason = String(params.reason || '').trim() || null;

      if (!sourceId || !date || !cycleKey) return bad('source_worker_id, date and cycle_key are required');
      if (sourceId === workerId) return bad('You cannot add a day from your own ID.');

      const total = Object.values(sheetAmounts).reduce((s, v) => s + (Number(v) || 0), 0);
      if (total <= 0) return bad('No earnings found for that ID on this date.');

      const { data: existing } = await supabase
        .from('day_transfers')
        .select('id')
        .eq('source_worker_id', sourceId)
        .eq('target_worker_id', workerId)
        .eq('transfer_date', date)
        .maybeSingle();
      if (existing) return bad('This day has already been transferred from that ID to you.');

      // Smart merge: if the source user already marked this date as "not worked"
      // (a self-deduction), supersede their record — the money has already been
      // taken off their side; turning this into a real transfer credits us
      // without debiting them twice.
      const { data: supersededDeduction } = await supabase
        .from('day_transfers')
        .select('id')
        .eq('source_worker_id', sourceId)
        .eq('target_worker_id', SELF_DEDUCT_SENTINEL)
        .eq('transfer_date', date)
        .eq('kind', 'user_deduction')
        .maybeSingle();

      if (supersededDeduction) {
        const { error: delErr } = await supabase
          .from('day_transfers')
          .delete()
          .eq('id', supersededDeduction.id);
        if (delErr) return bad(`Could not merge with the existing day-off record: ${delErr.message}`);

        await supabase.from('audit_logs').insert({
          action: 'user_addition_superseded_deduction',
          actor: workerId,
          target_type: 'transfer',
          target_id: supersededDeduction.id,
          details: { source_id: sourceId, date, note: 'Replaced source user\'s self-deduction with a transfer to claimant.' },
        });
      }

      const { data, error } = await supabase
        .from('day_transfers')
        .insert({
          source_worker_id: sourceId,
          target_worker_id: workerId,
          transfer_date: date,
          sheet_name: Object.keys(sheetAmounts).join(', ') || 'all',
          amount: total,
          bonus_amount: 0,
          ranking_bonus_amount: 0,
          cycle_key: cycleKey,
          reason,
          sheet_amounts: sheetAmounts,
          created_by_user_id: workerId,
          created_by: workerId,
          kind: 'user_addition',
        })
        .select()
        .single();

      if (error) return bad(error.message);

      await supabase.from('audit_logs').insert({
        action: 'user_create_addition',
        actor: workerId,
        target_type: 'transfer',
        target_id: data?.id,
        details: { source_id: sourceId, date, total, sheet_amounts: sheetAmounts },
      });

      return ok({ success: true, adjustment: data });
    }

    case 'list_my_adjustments': {
      const cycleKey = String(params.cycle_key || '').trim();
      let q = supabase
        .from('day_transfers')
        .select('*')
        .eq('created_by_user_id', workerId)
        .in('kind', ['user_deduction', 'user_addition'])
        .order('created_at', { ascending: false });
      if (cycleKey) q = q.eq('cycle_key', cycleKey);
      const { data, error } = await q;
      if (error) return bad(error.message);
      return ok({ success: true, adjustments: data || [] });
    }

    case 'delete_my_adjustment': {
      const adjustmentId = String(params.adjustment_id || '').trim();
      if (!adjustmentId) return bad('adjustment_id is required');
      // Verify ownership before deleting
      const { data: row } = await supabase
        .from('day_transfers')
        .select('id, created_by_user_id, kind')
        .eq('id', adjustmentId)
        .maybeSingle();
      if (!row) return bad('Adjustment not found.');
      if (row.created_by_user_id !== workerId) return bad('You can only delete your own adjustments.');
      if (!['user_deduction', 'user_addition'].includes(row.kind)) return bad('Only your own adjustments can be deleted here.');

      const { error } = await supabase.from('day_transfers').delete().eq('id', adjustmentId);
      if (error) return bad(error.message);

      await supabase.from('audit_logs').insert({
        action: 'user_delete_adjustment',
        actor: workerId,
        target_type: 'transfer',
        target_id: adjustmentId,
        details: { kind: row.kind },
      });

      return ok({ success: true });
    }

    default:
      return bad('Unknown action');
  }
});
