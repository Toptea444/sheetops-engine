import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { worker_id, answer } = await req.json();

    if (!worker_id || !answer || !['yes', 'no'].includes(answer)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid input' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Read existing feedback
    const { data: existing } = await supabase
      .from('admin_settings')
      .select('id, setting_value')
      .eq('setting_key', 'user_feedback')
      .maybeSingle();

    const responses = (existing?.setting_value as any[]) || [];
    responses.push({
      worker_id,
      answer,
      timestamp: new Date().toISOString(),
    });

    if (existing) {
      await supabase
        .from('admin_settings')
        .update({
          setting_value: responses,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
    } else {
      await supabase.from('admin_settings').insert({
        setting_key: 'user_feedback',
        setting_value: responses,
        description: 'User feedback responses',
      });
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: 'Server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
