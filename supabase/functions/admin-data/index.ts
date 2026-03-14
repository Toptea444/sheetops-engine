import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const ADMIN_SECRET = (Deno.env.get('ADMIN_PIN_RESET_SECRET') || 'default-admin-secret-change-me').trim();

function normalizeStage(stage: string): string {
  const compact = String(stage || '').toUpperCase().replace(/[\s\-_]/g, '');
  if (compact.startsWith('STAGE')) {
    const n = compact.replace(/^STAGE/, '');
    if (n) return `S${n}`;
  }
  return compact || 'UNKNOWN';
}

function isBonusSheetName(sheetName: string): boolean {
  const normalized = String(sheetName || '').toUpperCase();
  return normalized.includes('RANKING BONUS') || normalized.includes('WEEKLY BONUS');
}

function parseStageWorkerCoverageFromSnapshots(snapshots: Array<{ sheet_name: string; sheet_data: any }> | null | undefined) {
  const workersToStage = new Map<string, string>();
  const stageToWorkers = new Map<string, Set<string>>();

  const workerIdLike = (value: string) => {
    const v = String(value || '').trim().toUpperCase();
    if (!v) return false;
    if (v.includes(' ')) return false;
    if (v.length < 2 || v.length > 20) return false;
    return /^[A-Z0-9-]+$/.test(v) && /\d/.test(v);
  };

  snapshots?.forEach((snapshot) => {
    const rows: string[][] = Array.isArray(snapshot?.sheet_data?.rows)
      ? snapshot.sheet_data.rows.map((r: unknown) => Array.isArray(r) ? r.map((c: unknown) => String(c ?? '')) : [])
      : [];
    if (rows.length === 0) return;

    let stageCol = -1;
    let idCol = -1;
    let currentStage = '';

    for (const row of rows) {
      if (!Array.isArray(row) || row.length === 0) continue;

      if (stageCol < 0 || idCol < 0) {
        row.forEach((cell, idx) => {
          const normalized = String(cell || '').trim().toLowerCase();
          if (stageCol < 0 && (normalized === 'stage' || normalized === 'stages')) stageCol = idx;
          if (idCol < 0 && (normalized === 'id' || normalized === 'ids' || normalized === 'user id' || normalized === 'worker id')) idCol = idx;
        });
      }

      if (stageCol < 0 || idCol < 0) continue;

      const stageCell = String(row[stageCol] ?? '').trim();
      const idCell = String(row[idCol] ?? '').trim().toUpperCase();

      if (stageCell) {
        currentStage = stageCell;
      }

      if (!workerIdLike(idCell)) continue;

      const stage = normalizeStage(stageCell || currentStage);
      workersToStage.set(idCell, stage);
      const group = stageToWorkers.get(stage) || new Set<string>();
      group.add(idCell);
      stageToWorkers.set(stage, group);
    }
  });

  return {
    workersToStage,
    totalWorkers: workersToStage.size,
    byStageCounts: new Map<string, number>(
      Array.from(stageToWorkers.entries()).map(([stage, workers]) => [stage, workers.size])
    ),
  };
}

// ─── Audit Logger ────────────────────────────────────────────
async function logAudit(
  supabase: ReturnType<typeof createClient>,
  action: string,
  details?: Record<string, unknown>,
  targetType?: string,
  targetId?: string,
) {
  try {
    await supabase.from('audit_logs').insert({
      action,
      actor: 'admin',
      details: details || {},
      target_type: targetType || null,
      target_id: targetId || null,
    });
  } catch (e) {
    console.error('Audit log failed:', e);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { admin_secret: rawSecret, action, params } = await req.json();
    const admin_secret = typeof rawSecret === 'string' ? rawSecret.trim() : rawSecret;

    if (!admin_secret || admin_secret !== ADMIN_SECRET) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid admin secret' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let result: unknown;

    switch (action) {
      case 'get_workers': {
        const { data: pins } = await supabase.from('worker_pins').select('worker_id, created_at');
        const { data: sessions } = await supabase.from('worker_sessions').select('worker_id, last_heartbeat, device_fingerprint, created_at');
        const { data: identities } = await supabase.from('confirmed_identities').select('worker_id, confirmed_at, device_fingerprint');

        const workerMap = new Map<string, any>();

        pins?.forEach(p => {
          workerMap.set(p.worker_id, {
            worker_id: p.worker_id,
            has_pin: true,
            pin_created: p.created_at,
            sessions: [],
            identity_confirmed: false,
          });
        });

        sessions?.forEach(s => {
          const existing = workerMap.get(s.worker_id) || {
            worker_id: s.worker_id,
            has_pin: false,
            pin_created: null,
            sessions: [],
            identity_confirmed: false,
          };
          existing.sessions.push({
            last_heartbeat: s.last_heartbeat,
            device: s.device_fingerprint?.substring(0, 8) + '...',
            created_at: s.created_at,
          });
          workerMap.set(s.worker_id, existing);
        });

        identities?.forEach(i => {
          const existing = workerMap.get(i.worker_id);
          if (existing) {
            existing.identity_confirmed = true;
            existing.identity_confirmed_at = i.confirmed_at;
          }
        });

        result = {
          workers: Array.from(workerMap.values()).sort((a, b) => a.worker_id.localeCompare(b.worker_id)),
          total_workers: workerMap.size,
          total_with_pins: pins?.length || 0,
          total_confirmed: identities?.length || 0,
          total_active_sessions: sessions?.filter(s => {
            const hb = new Date(s.last_heartbeat);
            return (Date.now() - hb.getTime()) < 15 * 60 * 1000;
          }).length || 0,
        };
        break;
      }

      case 'get_cache_stats': {
        const { data: sheetCache } = await supabase.from('cycle_sheet_cache').select('id, sheet_name, cycle_key, updated_at');
        const { data: workerCache } = await supabase.from('cycle_worker_cache').select('id, worker_id, sheet_name, cycle_key, updated_at');

        const cycleGroups = new Map<string, { sheets: number; workers: number; lastUpdated: string }>();

        sheetCache?.forEach(s => {
          const group = cycleGroups.get(s.cycle_key) || { sheets: 0, workers: 0, lastUpdated: s.updated_at };
          group.sheets++;
          if (s.updated_at > group.lastUpdated) group.lastUpdated = s.updated_at;
          cycleGroups.set(s.cycle_key, group);
        });

        workerCache?.forEach(w => {
          const group = cycleGroups.get(w.cycle_key) || { sheets: 0, workers: 0, lastUpdated: w.updated_at };
          group.workers++;
          if (w.updated_at > group.lastUpdated) group.lastUpdated = w.updated_at;
          cycleGroups.set(w.cycle_key, group);
        });

        result = {
          cycles: Array.from(cycleGroups.entries()).map(([key, val]) => ({
            cycle_key: key,
            ...val,
          })).sort((a, b) => b.lastUpdated.localeCompare(a.lastUpdated)),
          total_sheet_cache: sheetCache?.length || 0,
          total_worker_cache: workerCache?.length || 0,
        };
        break;
      }

      case 'clear_cache': {
        const cycleKey = params?.cycle_key;
        if (cycleKey) {
          await supabase.from('cycle_sheet_cache').delete().eq('cycle_key', cycleKey);
          await supabase.from('cycle_worker_cache').delete().eq('cycle_key', cycleKey);
          await logAudit(supabase, 'clear_cache', { cycle_key: cycleKey }, 'cache', cycleKey);
          result = { cleared: true, cycle_key: cycleKey };
        } else {
          result = { cleared: false, error: 'No cycle_key provided' };
        }
        break;
      }

      case 'get_earnings_overview': {
        const filterCycle = params?.cycle_key;
        let query = supabase
          .from('cycle_worker_cache')
          .select('worker_id, sheet_name, cycle_key, result_data, updated_at');
        
        if (filterCycle) {
          query = query.eq('cycle_key', filterCycle);
        }

        const { data: workerCache } = await query;

        const { data: allCycles } = await supabase
          .from('cycle_worker_cache')
          .select('cycle_key');
        
        const uniqueCycles = [...new Set(allCycles?.map(c => c.cycle_key) || [])].sort().reverse();

        const earningsByWorker = new Map<string, number>();
        const earningsBySheet = new Map<string, { total: number; workers: { worker_id: string; amount: number }[] }>();

        workerCache?.forEach(w => {
          const data = w.result_data as any;
          const total = data?.totalBonus || data?.total || 0;

          earningsByWorker.set(w.worker_id, (earningsByWorker.get(w.worker_id) || 0) + total);
          
          const sheetEntry = earningsBySheet.get(w.sheet_name) || { total: 0, workers: [] };
          sheetEntry.total += total;
          sheetEntry.workers.push({ worker_id: w.worker_id, amount: total });
          earningsBySheet.set(w.sheet_name, sheetEntry);
        });

        const topEarners = Array.from(earningsByWorker.entries())
          .map(([id, total]) => ({ worker_id: id, total }))
          .sort((a, b) => b.total - a.total)
          .slice(0, 20);

        result = {
          top_earners: topEarners,
          by_sheet: Array.from(earningsBySheet.entries()).map(([name, val]) => ({ 
            sheet: name, total: val.total, worker_count: val.workers.length, workers: val.workers.sort((a, b) => b.amount - a.amount) 
          })),
          available_cycles: uniqueCycles,
          selected_cycle: filterCycle || null,
          total_records: workerCache?.length || 0,
        };
        break;
      }

      case 'get_worker_detail': {
        const workerId = params?.worker_id;
        if (!workerId) {
          result = { success: false, error: 'No worker_id provided' };
          break;
        }

        const { data: workerEarnings } = await supabase
          .from('cycle_worker_cache')
          .select('sheet_name, cycle_key, result_data, updated_at')
          .eq('worker_id', workerId);

        const { data: sessions } = await supabase
          .from('worker_sessions')
          .select('created_at, last_heartbeat, device_fingerprint')
          .eq('worker_id', workerId)
          .order('created_at', { ascending: false })
          .limit(50);

        const { data: pinData } = await supabase
          .from('worker_pins')
          .select('created_at')
          .eq('worker_id', workerId)
          .maybeSingle();

        const { data: identity } = await supabase
          .from('confirmed_identities')
          .select('confirmed_at, device_fingerprint')
          .eq('worker_id', workerId)
          .maybeSingle();

        const earningsByCycle = new Map<string, { total: number; sheets: { sheet: string; amount: number }[] }>();
        
        workerEarnings?.forEach(e => {
          const data = e.result_data as any;
          const amount = data?.totalBonus || data?.total || 0;
          const entry = earningsByCycle.get(e.cycle_key) || { total: 0, sheets: [] };
          entry.total += amount;
          entry.sheets.push({ sheet: e.sheet_name, amount });
          earningsByCycle.set(e.cycle_key, entry);
        });

        const grandTotal = Array.from(earningsByCycle.values()).reduce((sum, c) => sum + c.total, 0);

        result = {
          worker_id: workerId,
          has_pin: !!pinData,
          pin_created: pinData?.created_at || null,
          identity_confirmed: !!identity,
          identity_confirmed_at: identity?.confirmed_at || null,
          grand_total: grandTotal,
          earnings_by_cycle: Array.from(earningsByCycle.entries()).map(([key, val]) => ({
            cycle_key: key,
            total: val.total,
            sheets: val.sheets.sort((a, b) => b.amount - a.amount),
          })).sort((a, b) => b.cycle_key.localeCompare(a.cycle_key)),
          sessions: sessions || [],
          total_sessions: sessions?.length || 0,
        };
        break;
      }

      case 'reset_pin': {
        const workerId = params?.worker_id;
        if (!workerId) {
          result = { success: false, error: 'No worker_id provided' };
          break;
        }

        const { data: existingPin } = await supabase
          .from('worker_pins')
          .select('id')
          .eq('worker_id', workerId.toUpperCase())
          .maybeSingle();

        if (!existingPin) {
          result = { success: false, error: 'No PIN found for this Worker ID' };
          break;
        }

        const { error: deleteError } = await supabase
          .from('worker_pins')
          .delete()
          .eq('worker_id', workerId.toUpperCase());

        if (deleteError) {
          result = { success: false, error: 'Failed to reset PIN' };
        } else {
          await logAudit(supabase, 'reset_pin', { worker_id: workerId.toUpperCase() }, 'worker', workerId.toUpperCase());
          result = { success: true, message: `PIN reset for ${workerId.toUpperCase()}` };
        }
        break;
      }

      case 'get_activity': {
        const { data: recentPins } = await supabase
          .from('worker_pins')
          .select('worker_id, created_at')
          .order('created_at', { ascending: false })
          .limit(20);

        const { data: recentIdentities } = await supabase
          .from('confirmed_identities')
          .select('worker_id, confirmed_at, device_fingerprint')
          .order('confirmed_at', { ascending: false })
          .limit(20);

        const { data: recentSessions } = await supabase
          .from('worker_sessions')
          .select('worker_id, created_at, last_heartbeat, device_fingerprint')
          .order('created_at', { ascending: false })
          .limit(20);

        result = {
          recent_pins: recentPins || [],
          recent_identities: recentIdentities || [],
          recent_sessions: recentSessions || [],
        };
        break;
      }

      case 'get_site_settings': {
        const { data: restrictedRow } = await supabase
          .from('admin_settings')
          .select('setting_value')
          .eq('setting_key', 'site_restricted')
          .maybeSingle();

        const { data: currencyRow } = await supabase
          .from('admin_settings')
          .select('setting_value')
          .eq('setting_key', 'currency_symbol')
          .maybeSingle();

        const restrictedVal = restrictedRow?.setting_value as { enabled?: boolean; message?: string } | null;
        const currencyVal = currencyRow?.setting_value as string | null;

        result = {
          is_restricted: restrictedVal?.enabled ?? false,
          restriction_message: restrictedVal?.message ?? 'The site is currently under maintenance. Please check back later.',
          currency_symbol: currencyVal ?? '₦',
        };
        break;
      }

      case 'toggle_site_restriction': {
        const isRestricted = params?.is_restricted ?? false;
        const message = params?.restriction_message ?? 'The site is currently under maintenance. Please check back later.';

        const newValue = { enabled: isRestricted, message };

        const { data: existing } = await supabase
          .from('admin_settings')
          .select('id')
          .eq('setting_key', 'site_restricted')
          .maybeSingle();

        if (existing) {
          await supabase
            .from('admin_settings')
            .update({
              setting_value: newValue,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id);
        } else {
          await supabase.from('admin_settings').insert({
            setting_key: 'site_restricted',
            setting_value: newValue,
            description: 'Controls whether the site is restricted',
          });
        }

        await logAudit(supabase, 'toggle_site_restriction', { is_restricted: isRestricted }, 'settings', 'site_restricted');
        result = { success: true, is_restricted: isRestricted };
        break;
      }

      case 'get_alerts': {
        const { data: alerts } = await supabase
          .from('admin_alerts')
          .select('*')
          .order('is_active', { ascending: false })
          .order('priority', { ascending: false })
          .order('created_at', { ascending: false });

        result = { alerts: alerts || [] };
        break;
      }

      case 'create_alert': {
        const { title, message, type } = params;

        if (!title || !message) {
          result = { success: false, error: 'Title and message are required' };
          break;
        }

        const { data, error } = await supabase
          .from('admin_alerts')
          .insert({
            title,
            message,
            alert_type: type || 'info',
            is_active: true,
            created_at: new Date().toISOString(),
          })
          .select()
          .maybeSingle();

        if (error) {
          result = { success: false, error: error.message };
        } else {
          await logAudit(supabase, 'create_alert', { title, type: type || 'info' }, 'alert', data?.id);
          result = { success: true, alert: data };
        }
        break;
      }

      case 'delete_alert': {
        const alertId = params?.alert_id;

        if (!alertId) {
          result = { success: false, error: 'Alert ID is required' };
          break;
        }

        const { error } = await supabase
          .from('admin_alerts')
          .delete()
          .eq('id', alertId);

        if (error) {
          result = { success: false, error: error.message };
        } else {
          await logAudit(supabase, 'delete_alert', { alert_id: alertId }, 'alert', alertId);
          result = { success: true };
        }
        break;
      }

      case 'toggle_alert': {
        const toggleAlertId = params?.alert_id;
        const newActive = params?.is_active ?? false;

        if (!toggleAlertId) {
          result = { success: false, error: 'Alert ID is required' };
          break;
        }

        const { error: toggleErr } = await supabase
          .from('admin_alerts')
          .update({ is_active: newActive, updated_at: new Date().toISOString() })
          .eq('id', toggleAlertId);

        if (toggleErr) {
          result = { success: false, error: toggleErr.message };
        } else {
          await logAudit(supabase, 'toggle_alert', { alert_id: toggleAlertId, is_active: newActive }, 'alert', toggleAlertId);
          result = { success: true };
        }
        break;
      }

      case 'get_feedback': {
        const { data: feedbackRow } = await supabase
          .from('admin_settings')
          .select('setting_value')
          .eq('setting_key', 'user_feedback')
          .maybeSingle();

        const responses = (feedbackRow?.setting_value as any[]) || [];

        const yesCount = responses.filter((r: any) => r.answer === 'yes').length;
        const noCount = responses.filter((r: any) => r.answer === 'no').length;

        result = {
          responses,
          total: responses.length,
          yes_count: yesCount,
          no_count: noCount,
        };
        break;
      }

      case 'get_pin_reset_requests': {
        const { data: requests } = await supabase
          .from('pin_reset_requests')
          .select('*')
          .order('requested_at', { ascending: false });

        const pending = requests?.filter(r => r.status === 'pending') || [];
        const resolved = requests?.filter(r => r.status !== 'pending') || [];

        result = {
          requests: requests || [],
          pending_count: pending.length,
          resolved_count: resolved.length,
        };
        break;
      }

      case 'resolve_pin_reset_request': {
        const requestId = params?.request_id;
        const action_type = params?.action_type;

        if (!requestId || !action_type) {
          result = { success: false, error: 'Request ID and action type required' };
          break;
        }

        if (action_type === 'approve') {
          const { data: request } = await supabase
            .from('pin_reset_requests')
            .select('worker_id')
            .eq('id', requestId)
            .maybeSingle();

          if (!request) {
            result = { success: false, error: 'Request not found' };
            break;
          }

          await supabase
            .from('worker_pins')
            .delete()
            .eq('worker_id', request.worker_id.toUpperCase());

          await supabase
            .from('pin_reset_requests')
            .update({ 
              status: 'approved', 
              resolved_at: new Date().toISOString(),
              resolved_by: 'admin'
            })
            .eq('id', requestId);

          await logAudit(supabase, 'approve_pin_reset', { worker_id: request.worker_id, request_id: requestId }, 'pin_reset_request', requestId);
          result = { success: true, message: `PIN reset approved for ${request.worker_id}` };
        } else {
          await supabase
            .from('pin_reset_requests')
            .update({ 
              status: 'denied', 
              resolved_at: new Date().toISOString(),
              resolved_by: 'admin'
            })
            .eq('id', requestId);

          await logAudit(supabase, 'deny_pin_reset', { request_id: requestId }, 'pin_reset_request', requestId);
          result = { success: true, message: 'Request denied' };
        }
        break;
      }

      case 'force_logout': {
        const workerId = params?.worker_id as string;
        if (!workerId) {
          result = { error: 'Missing worker_id' };
          break;
        }

        const { error: delError } = await supabase
          .from('worker_sessions')
          .delete()
          .eq('worker_id', workerId.toUpperCase());

        if (delError) {
          result = { error: 'Failed to delete sessions' };
        } else {
          await logAudit(supabase, 'force_logout', { worker_id: workerId.toUpperCase() }, 'worker', workerId.toUpperCase());
          result = { success: true, message: `All sessions cleared for ${workerId.toUpperCase()}` };
        }
        break;
      }

      // ─── ID Swaps ─────────────────────────────────────────
      case 'get_swaps': {
        const filterCycle = params?.cycle_key;
        let query = supabase.from('id_swaps').select('*').order('created_at', { ascending: false });
        if (filterCycle) query = query.eq('cycle_key', filterCycle);
        const { data: swaps } = await query;
        result = { swaps: swaps || [] };
        break;
      }

      case 'create_swap': {
        const { worker_name, old_worker_id, new_worker_id, effective_date, cycle_key, notes } = params || {};
        if (!worker_name || !old_worker_id || !new_worker_id || !effective_date || !cycle_key) {
          result = { success: false, error: 'worker_name, old_worker_id, new_worker_id, effective_date, and cycle_key are required' };
          break;
        }
        const oldId = old_worker_id.trim().toUpperCase();
        const newId = new_worker_id.trim().toUpperCase();

        const { data, error } = await supabase.from('id_swaps').insert({
          worker_name: worker_name.trim(),
          old_worker_id: oldId,
          new_worker_id: newId,
          effective_date,
          cycle_key,
          notes: notes || null,
        }).select().maybeSingle();
        if (error) {
          result = { success: false, error: error.message };
        } else {
          await supabase.from('worker_pins').delete().eq('worker_id', oldId);
          await supabase.from('worker_pins').delete().eq('worker_id', newId);
          await logAudit(supabase, 'create_swap', { old_worker_id: oldId, new_worker_id: newId, effective_date, cycle_key }, 'swap', data?.id);
          result = { success: true, swap: data, pins_cleared: [oldId, newId] };
        }
        break;
      }

      case 'bulk_create_swaps': {
        const swaps = params?.swaps as Array<{ old_worker_id: string; new_worker_id: string; effective_date: string; notes?: string }>;
        const bulkCycleKey = params?.cycle_key;

        if (!swaps || !Array.isArray(swaps) || swaps.length === 0 || !bulkCycleKey) {
          result = { success: false, error: 'swaps array and cycle_key are required' };
          break;
        }

        const created: any[] = [];
        const errors: string[] = [];

        for (const swap of swaps) {
          const oldId = swap.old_worker_id?.trim().toUpperCase();
          const newId = swap.new_worker_id?.trim().toUpperCase();
          if (!oldId || !newId || !swap.effective_date) {
            errors.push(`Invalid swap: ${oldId} → ${newId}`);
            continue;
          }

          const workerName = `${oldId} → ${newId}`;
          const { data, error } = await supabase.from('id_swaps').insert({
            worker_name: workerName,
            old_worker_id: oldId,
            new_worker_id: newId,
            effective_date: swap.effective_date,
            cycle_key: bulkCycleKey,
            notes: swap.notes || null,
          }).select().maybeSingle();

          if (error) {
            errors.push(`${oldId} → ${newId}: ${error.message}`);
          } else {
            await supabase.from('worker_pins').delete().eq('worker_id', oldId);
            await supabase.from('worker_pins').delete().eq('worker_id', newId);
            created.push(data);
            await logAudit(supabase, 'create_swap', { old_worker_id: oldId, new_worker_id: newId, effective_date: swap.effective_date, bulk: true }, 'swap', data?.id);
          }
        }

        result = { success: true, created_count: created.length, error_count: errors.length, errors: errors.length > 0 ? errors : undefined };
        break;
      }

      case 'delete_swap': {
        const swapId = params?.swap_id;
        if (!swapId) { result = { success: false, error: 'swap_id required' }; break; }
        const { error } = await supabase.from('id_swaps').delete().eq('id', swapId);
        if (error) {
          result = { success: false, error: error.message };
        } else {
          await logAudit(supabase, 'delete_swap', { swap_id: swapId }, 'swap', swapId);
          result = { success: true };
        }
        break;
      }

      // ─── Day Transfers ────────────────────────────────────
      case 'get_transfers': {
        const filterCycle2 = params?.cycle_key;
        let query2 = supabase.from('day_transfers').select('*').order('created_at', { ascending: false });
        if (filterCycle2) query2 = query2.eq('cycle_key', filterCycle2);
        const { data: transfers } = await query2;
        result = { transfers: transfers || [] };
        break;
      }

      case 'create_transfer': {
        const { source_worker_id, target_worker_id, transfer_date, sheet_name, amount, bonus_amount, ranking_bonus_amount, cycle_key: tCycleKey, reason, sheet_amounts } = params || {};
        if (!source_worker_id || !target_worker_id || !transfer_date || !sheet_name || amount === undefined || !tCycleKey) {
          result = { success: false, error: 'source_worker_id, target_worker_id, transfer_date, sheet_name, amount, and cycle_key are required' };
          break;
        }
        const { data, error } = await supabase.from('day_transfers').insert({
          source_worker_id: source_worker_id.trim().toUpperCase(),
          target_worker_id: target_worker_id.trim().toUpperCase(),
          transfer_date,
          sheet_name: sheet_name.trim(),
          amount: Number(amount),
          bonus_amount: Number(bonus_amount || 0),
          ranking_bonus_amount: Number(ranking_bonus_amount || 0),
          cycle_key: tCycleKey,
          reason: reason || null,
          sheet_amounts: sheet_amounts || {},
        }).select().maybeSingle();
        if (error) {
          result = { success: false, error: error.message };
        } else {
          await logAudit(supabase, 'create_transfer', { source: source_worker_id, target: target_worker_id, amount, transfer_date }, 'transfer', data?.id);
          result = { success: true, transfer: data };
        }
        break;
      }

      case 'delete_transfer': {
        const transferId = params?.transfer_id;
        if (!transferId) { result = { success: false, error: 'transfer_id required' }; break; }
        const { error } = await supabase.from('day_transfers').delete().eq('id', transferId);
        if (error) {
          result = { success: false, error: error.message };
        } else {
          await logAudit(supabase, 'delete_transfer', { transfer_id: transferId }, 'transfer', transferId);
          result = { success: true };
        }
        break;
      }

      // ─── Audit Log ────────────────────────────────────────
      case 'get_audit_logs': {
        const limit = params?.limit || 100;
        const offset = params?.offset || 0;
        const { data: logs, count } = await supabase
          .from('audit_logs')
          .select('*', { count: 'exact' })
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);

        result = { logs: logs || [], total: count || 0 };
        break;
      }

      // ─── Cycle Report ─────────────────────────────────────
      case 'get_cycle_stage_totals': {
        const reportCycleKey = params?.cycle_key;
        if (!reportCycleKey) {
          result = { success: false, error: 'cycle_key is required' };
          break;
        }

        const { data: sheetSnapshots } = await supabase
          .from('cycle_sheet_cache')
          .select('sheet_name, sheet_data')
          .eq('cycle_key', reportCycleKey);

        const { data: workerCache } = await supabase
          .from('cycle_worker_cache')
          .select('worker_id, sheet_name, result_data')
          .eq('cycle_key', reportCycleKey);

        // Available cycles
        const { data: allSheetCycles } = await supabase
          .from('cycle_sheet_cache')
          .select('cycle_key');
        const { data: allWorkerCycles } = await supabase
          .from('cycle_worker_cache')
          .select('cycle_key');
        const uniqueCycles = [...new Set([
          ...(allSheetCycles?.map(c => c.cycle_key) || []),
          ...(allWorkerCycles?.map(c => c.cycle_key) || []),
        ])].sort().reverse();

        const includedSheets = [...new Set(
          (workerCache || [])
            .map((worker) => worker.sheet_name)
            .filter((sheetName) => !isBonusSheetName(sheetName))
        )];
        const includedSheetSet = new Set(includedSheets);

        const sheetCoverage = parseStageWorkerCoverageFromSnapshots(sheetSnapshots);
        const stageTotals = new Map<string, { total: number; workers: Map<string, number> }>();
        let grandTotal = 0;

        (workerCache || []).forEach((w) => {
          if (!includedSheetSet.has(w.sheet_name)) return;

          const d = w.result_data as any;
          const amount = Number(d?.totalBonus ?? d?.total ?? 0);
          const rawStage = d?.stage || sheetCoverage.workersToStage.get(String(w.worker_id || '').toUpperCase()) || '';
          const stage = normalizeStage(rawStage);

          const stageEntry = stageTotals.get(stage) || { total: 0, workers: new Map<string, number>() };
          stageEntry.total += amount;
          stageEntry.workers.set(w.worker_id, (stageEntry.workers.get(w.worker_id) || 0) + amount);
          stageTotals.set(stage, stageEntry);
          grandTotal += amount;
        });

        const byStage = Array.from(stageTotals.entries())
          .map(([stage, data]) => ({
            stage,
            total: data.total,
            worker_count: data.workers.size,
            workers: Array.from(data.workers.entries())
              .map(([workerId, total]) => ({ worker_id: workerId, total }))
              .sort((a, b) => b.total - a.total),
          }))
          .sort((a, b) => b.total - a.total);

        result = {
          cycle_key: reportCycleKey,
          available_cycles: uniqueCycles,
          grand_total: grandTotal,
          included_sheets: includedSheets.sort((a, b) => a.localeCompare(b)),
          excluded_sheet_keywords: ['RANKING BONUS', 'WEEKLY BONUS'],
          by_stage: byStage,
        };
        break;
      }

      case 'get_cycle_report': {
        const reportCycleKey = params?.cycle_key;
        if (!reportCycleKey) {
          result = { success: false, error: 'cycle_key is required' };
          break;
        }

        const { data: workerCache } = await supabase
          .from('cycle_worker_cache')
          .select('worker_id, sheet_name, result_data')
          .eq('cycle_key', reportCycleKey);

        const { data: sheetSnapshots } = await supabase
          .from('cycle_sheet_cache')
          .select('sheet_name, sheet_data')
          .eq('cycle_key', reportCycleKey);
        const sheetCoverage = parseStageWorkerCoverageFromSnapshots(sheetSnapshots);

        // Available cycles
        const { data: allCycles } = await supabase
          .from('cycle_sheet_cache')
          .select('cycle_key');
        const uniqueCycles = [...new Set(allCycles?.map(c => c.cycle_key) || [])].sort().reverse();

        const earningsByWorker = new Map<string, { total: number; stage: string; sheets: Record<string, number> }>();
        const sheetTotals = new Map<string, { total: number; workerCount: number }>();
        const stageTotals = new Map<string, { total: number; workers: Map<string, number>; sheets: Map<string, number> }>();
        let grandTotal = 0;

        workerCache?.forEach(w => {
          const d = w.result_data as any;
          const amount = d?.totalBonus || d?.total || 0;
          const rawStage = d?.stage || '';
          const stage = normalizeStage(rawStage);
          grandTotal += amount;

          // Per-worker aggregation
          const entry = earningsByWorker.get(w.worker_id) || { total: 0, stage, sheets: {} };
          entry.total += amount;
          entry.sheets[w.sheet_name] = (entry.sheets[w.sheet_name] || 0) + amount;
          if (!entry.stage || entry.stage === 'UNKNOWN') entry.stage = stage;
          earningsByWorker.set(w.worker_id, entry);

          // Per-sheet aggregation
          const sheetEntry = sheetTotals.get(w.sheet_name) || { total: 0, workerCount: 0 };
          sheetEntry.total += amount;
          sheetEntry.workerCount++;
          sheetTotals.set(w.sheet_name, sheetEntry);

          // Per-stage aggregation
          const stageEntry = stageTotals.get(stage) || { total: 0, workers: new Map(), sheets: new Map() };
          stageEntry.total += amount;
          stageEntry.workers.set(w.worker_id, (stageEntry.workers.get(w.worker_id) || 0) + amount);
          stageEntry.sheets.set(w.sheet_name, (stageEntry.sheets.get(w.sheet_name) || 0) + amount);
          stageTotals.set(stage, stageEntry);
        });

        const allWorkers = Array.from(earningsByWorker.entries())
          .map(([id, val]) => ({ worker_id: id, total: val.total, stage: val.stage, sheets: val.sheets }))
          .sort((a, b) => b.total - a.total);

        const totalWorkersFromEarnings = allWorkers.length;
        const totalWorkers = sheetCoverage.totalWorkers || totalWorkersFromEarnings;
        const avgEarning = totalWorkersFromEarnings > 0 ? grandTotal / totalWorkersFromEarnings : 0;

        // Build stage breakdown
        const byStage = Array.from(stageTotals.entries()).map(([stage, data]) => {
          const stageWorkers = Array.from(data.workers.entries())
            .map(([id, total]) => ({ worker_id: id, total }))
            .sort((a, b) => b.total - a.total);
          const stageSheets = Array.from(data.sheets.entries())
            .map(([sheet, total]) => ({ sheet, total }))
            .sort((a, b) => b.total - a.total);
          const workerCountFromEarnings = stageWorkers.length;
          const workerCount = sheetCoverage.byStageCounts.get(stage) || workerCountFromEarnings;
          const avgStage = workerCountFromEarnings > 0 ? data.total / workerCountFromEarnings : 0;
          return {
            stage,
            total: data.total,
            worker_count: workerCount,
            avg_earning: avgStage,
            top_earners: stageWorkers.slice(0, 5),
            bottom_earners: stageWorkers.length > 2 ? stageWorkers.slice(-3).reverse() : [],
            by_sheet: stageSheets,
          };
        }).sort((a, b) => b.total - a.total);

        // Include stages that may have workers but no cached earnings yet.
        sheetCoverage.byStageCounts.forEach((workerCount, stage) => {
          if (!byStage.some((s) => s.stage === stage)) {
            byStage.push({
              stage,
              total: 0,
              worker_count: workerCount,
              avg_earning: 0,
              top_earners: [],
              bottom_earners: [],
              by_sheet: [],
            });
          }
        });

        byStage.sort((a, b) => b.total - a.total);

        // Transfers & swaps for this cycle
        const { data: transfers } = await supabase
          .from('day_transfers')
          .select('id, amount, source_worker_id, target_worker_id, sheet_name')
          .eq('cycle_key', reportCycleKey);
        const { data: swaps } = await supabase
          .from('id_swaps')
          .select('id')
          .eq('cycle_key', reportCycleKey);

        // Per-sheet transfer totals
        const transfersBySheet: Record<string, { count: number; total_amount: number }> = {};
        transfers?.forEach(t => {
          const entry = transfersBySheet[t.sheet_name] || { count: 0, total_amount: 0 };
          entry.count++;
          entry.total_amount += t.amount || 0;
          transfersBySheet[t.sheet_name] = entry;
        });

        result = {
          cycle_key: reportCycleKey,
          available_cycles: uniqueCycles,
          grand_total: grandTotal,
          total_workers: totalWorkers,
          avg_earning: avgEarning,
          top_earners: allWorkers.slice(0, 10),
          bottom_earners: allWorkers.length > 3 ? allWorkers.slice(-5).reverse() : [],
          by_sheet: Array.from(sheetTotals.entries()).map(([name, val]) => ({
            sheet: name,
            total: val.total,
            worker_count: val.workerCount,
          })).sort((a, b) => b.total - a.total),
          by_stage: byStage,
          stats_source: {
            total_workers: sheetCoverage.totalWorkers ? 'cycle_sheet_cache' : 'cycle_worker_cache',
            by_stage_counts: sheetCoverage.totalWorkers ? 'cycle_sheet_cache' : 'cycle_worker_cache',
          },
          total_transfers: transfers?.length || 0,
          total_transfer_amount: transfers?.reduce((s, t) => s + (t.amount || 0), 0) || 0,
          transfers_by_sheet: transfersBySheet,
          total_swaps: swaps?.length || 0,
        };
        break;
      }

      // ─── Worker Notes ─────────────────────────────────────
      case 'get_worker_notes': {
        const noteWorkerId = params?.worker_id;
        let notesQuery = supabase.from('worker_notes').select('*').order('created_at', { ascending: false });
        if (noteWorkerId) {
          notesQuery = notesQuery.eq('worker_id', noteWorkerId.toUpperCase());
        }
        const { data: notes } = await notesQuery.limit(200);
        result = { notes: notes || [] };
        break;
      }

      case 'create_worker_note': {
        const { worker_id: nwId, note: noteText } = params || {};
        if (!nwId || !noteText) {
          result = { success: false, error: 'worker_id and note are required' };
          break;
        }
        const { data, error } = await supabase.from('worker_notes').insert({
          worker_id: nwId.trim().toUpperCase(),
          note: noteText.trim(),
          created_by: 'admin',
        }).select().maybeSingle();
        if (error) {
          result = { success: false, error: error.message };
        } else {
          await logAudit(supabase, 'create_worker_note', { worker_id: nwId.trim().toUpperCase() }, 'worker_note', data?.id);
          result = { success: true, note: data };
        }
        break;
      }

      case 'update_worker_note': {
        const { note_id, note: updatedText } = params || {};
        if (!note_id || !updatedText) {
          result = { success: false, error: 'note_id and note are required' };
          break;
        }
        const { error } = await supabase.from('worker_notes')
          .update({ note: updatedText.trim(), updated_at: new Date().toISOString() })
          .eq('id', note_id);
        if (error) {
          result = { success: false, error: error.message };
        } else {
          await logAudit(supabase, 'update_worker_note', { note_id }, 'worker_note', note_id);
          result = { success: true };
        }
        break;
      }

      case 'delete_worker_note': {
        const delNoteId = params?.note_id;
        if (!delNoteId) { result = { success: false, error: 'note_id required' }; break; }
        const { error } = await supabase.from('worker_notes').delete().eq('id', delNoteId);
        if (error) {
          result = { success: false, error: error.message };
        } else {
          await logAudit(supabase, 'delete_worker_note', { note_id: delNoteId }, 'worker_note', delNoteId);
          result = { success: true };
        }
        break;
      }

      default:
        result = { error: 'Unknown action' };
    }

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Admin data error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
