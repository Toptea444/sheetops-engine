import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Simple hash function for PIN (using Web Crypto API) - must match set-worker-pin
async function hashPin(pin: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { worker_id, pin } = await req.json();

    // Validate inputs
    if (!worker_id || typeof worker_id !== 'string') {
      return new Response(
        JSON.stringify({ valid: false, error: 'Worker ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!pin || typeof pin !== 'string') {
      return new Response(
        JSON.stringify({ valid: false, error: 'PIN is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role for database operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the stored PIN hash
    const { data: pinRecord, error: fetchError } = await supabase
      .from('worker_pins')
      .select('pin_hash')
      .eq('worker_id', worker_id.toUpperCase())
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching PIN:', fetchError);
      return new Response(
        JSON.stringify({ valid: false, error: 'Failed to verify PIN' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!pinRecord) {
      return new Response(
        JSON.stringify({ valid: false, error: 'No PIN set for this Worker ID', pinExists: false }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Hash the provided PIN and compare
    const providedHash = await hashPin(pin, worker_id.toUpperCase());
    const isValid = providedHash === pinRecord.pin_hash;

    return new Response(
      JSON.stringify({ valid: isValid, error: isValid ? null : 'Incorrect PIN' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ valid: false, error: 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
