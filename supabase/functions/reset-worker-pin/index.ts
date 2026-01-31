import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Admin secret for PIN reset - should be a secure passphrase
const ADMIN_SECRET = Deno.env.get('ADMIN_PIN_RESET_SECRET') || 'default-admin-secret-change-me';

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { worker_id, admin_secret } = await req.json();

    // Validate inputs
    if (!worker_id || typeof worker_id !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'Worker ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!admin_secret || typeof admin_secret !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'Admin secret is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify admin secret
    if (admin_secret !== ADMIN_SECRET) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid admin secret' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role for database operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if PIN exists for this worker
    const { data: existingPin, error: checkError } = await supabase
      .from('worker_pins')
      .select('id')
      .eq('worker_id', worker_id.toUpperCase())
      .maybeSingle();

    if (checkError) {
      console.error('Error checking existing PIN:', checkError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to check PIN' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!existingPin) {
      return new Response(
        JSON.stringify({ success: false, error: 'No PIN found for this Worker ID' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Delete the PIN record (using service role bypasses RLS)
    const { error: deleteError } = await supabase
      .from('worker_pins')
      .delete()
      .eq('worker_id', worker_id.toUpperCase());

    if (deleteError) {
      console.error('Error deleting PIN:', deleteError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to reset PIN' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: `PIN reset for ${worker_id.toUpperCase()}` }),
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
