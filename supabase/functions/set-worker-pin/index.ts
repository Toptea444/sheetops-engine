import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple hash function for PIN (using Web Crypto API)
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
        JSON.stringify({ success: false, error: 'Worker ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!pin || typeof pin !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'PIN is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate PIN format (4-6 digits)
    if (!/^\d{4,6}$/.test(pin)) {
      return new Response(
        JSON.stringify({ success: false, error: 'PIN must be 4-6 digits' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role for database operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if PIN already exists for this worker
    const { data: existingPin, error: checkError } = await supabase
      .from('worker_pins')
      .select('id')
      .eq('worker_id', worker_id.toUpperCase())
      .maybeSingle();

    if (checkError) {
      console.error('Error checking existing PIN:', checkError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to check existing PIN' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (existingPin) {
      return new Response(
        JSON.stringify({ success: false, error: 'PIN already set for this Worker ID' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Hash the PIN with worker_id as salt (unique per worker)
    const pinHash = await hashPin(pin, worker_id.toUpperCase());

    // Store the hashed PIN
    const { error: insertError } = await supabase
      .from('worker_pins')
      .insert({
        worker_id: worker_id.toUpperCase(),
        pin_hash: pinHash,
      });

    if (insertError) {
      console.error('Error inserting PIN:', insertError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to set PIN' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
