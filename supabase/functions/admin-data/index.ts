import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ADMIN_SECRET = (Deno.env.get('ADMIN_PIN_RESET_SECRET') || 'default-admin-secret-change-me').trim();

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
        // Get all workers with PIN status and session info
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
          result = { cleared: true, cycle_key: cycleKey };
        } else {
          result = { cleared: false, error: 'No cycle_key provided' };
        }
        break;
      }

      case 'get_earnings_overview': {
        // Filter by cycle_key if provided
        const filterCycle = params?.cycle_key;
        let query = supabase
          .from('cycle_worker_cache')
          .select('worker_id, sheet_name, cycle_key, result_data, updated_at');
        
        if (filterCycle) {
          query = query.eq('cycle_key', filterCycle);
        }

        const { data: workerCache } = await query;

        // Also get available cycles for the dropdown
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

        // Get all cached earnings for this worker
        const { data: workerEarnings } = await supabase
          .from('cycle_worker_cache')
          .select('sheet_name, cycle_key, result_data, updated_at')
          .eq('worker_id', workerId);

        // Get sessions (login history)
        const { data: sessions } = await supabase
          .from('worker_sessions')
          .select('created_at, last_heartbeat, device_fingerprint')
          .eq('worker_id', workerId)
          .order('created_at', { ascending: false })
          .limit(50);

        // Get PIN info
        const { data: pinData } = await supabase
          .from('worker_pins')
          .select('created_at')
          .eq('worker_id', workerId)
          .maybeSingle();

        // Get identity confirmation
        const { data: identity } = await supabase
          .from('confirmed_identities')
          .select('confirmed_at, device_fingerprint')
          .eq('worker_id', workerId)
          .maybeSingle();

        // Group earnings by cycle
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
        // Read from key-value JSONB schema
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

        result = { success: true, is_restricted: isRestricted };
        break;
      }

      case 'get_alerts': {
        // Admin sees ALL alerts (active and inactive)
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
