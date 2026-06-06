import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

function cleanId(value: unknown) {
  return String(value || '').trim().toUpperCase();
}

function cleanDate(value: unknown) {
  const text = String(value || '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : '';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const action = String(body?.action || '').trim();
    const workerId = cleanId(body?.worker_id);
    const otherWorkerId = cleanId(body?.other_worker_id);
    const transferDate = cleanDate(body?.transfer_date);
    const cycleKey = String(body?.cycle_key || '').trim();
    const sheetAmounts = body?.sheet_amounts && typeof body.sheet_amounts === 'object' ? body.sheet_amounts : {};
    const amount = Number(body?.amount || 0);
    const bonusAmount = Number(body?.bonus_amount || 0);
    const rankingBonusAmount = Number(body?.ranking_bonus_amount || 0);
    const note = String(body?.note || '').trim();

    if (!['deduct_unworked_day', 'add_worked_id'].includes(action)) {
      return json({ success: false, error: 'Invalid adjustment type.' }, 400);
    }
    if (!workerId || !transferDate || !cycleKey || !Number.isFinite(amount) || amount <= 0) {
      return json({ success: false, error: 'Worker ID, date, cycle, and a positive amount are required.' }, 400);
    }
    if (action === 'add_worked_id' && (!otherWorkerId || otherWorkerId === workerId)) {
      return json({ success: false, error: 'Enter the other worker ID you worked on.' }, 400);
    }

    const sheetNames = Object.keys(sheetAmounts).filter((name) => Number(sheetAmounts[name]) > 0);
    if (sheetNames.length === 0) {
      return json({ success: false, error: 'No sheet earnings were found for this date.' }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const sourceWorkerId = action === 'deduct_unworked_day' ? workerId : otherWorkerId;
    const targetWorkerId = action === 'deduct_unworked_day' ? '__UNWORKED_DAY__' : workerId;

    const { data, error } = await supabase.from('day_transfers').insert({
      source_worker_id: sourceWorkerId,
      target_worker_id: targetWorkerId,
      transfer_date: transferDate,
      sheet_name: sheetNames.length === 1 ? sheetNames[0] : 'Multiple sheets',
      amount,
      bonus_amount: bonusAmount,
      ranking_bonus_amount: rankingBonusAmount,
      cycle_key: cycleKey,
      reason: note || null,
      sheet_amounts: sheetAmounts,
      created_by: `user:${workerId}`,
    }).select().maybeSingle();

    if (error) return json({ success: false, error: error.message }, 500);

    return json({ success: true, transfer: data });
  } catch (err) {
    console.error('user-earnings-adjustment error', err);
    return json({ success: false, error: 'Server error. Please try again.' }, 500);
  }
});
