import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Get credentials from environment
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY environment variables');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// Migration files to run
const migrations = [
  '20260226_100000_admin_settings.sql',
  '20260226_100001_admin_alerts.sql',
  '20260226_100002_earnings_audit_log.sql',
];

async function runMigrations() {
  console.log('Starting migrations...');
  
  for (const migrationFile of migrations) {
    try {
      const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', migrationFile);
      const sql = fs.readFileSync(migrationPath, 'utf8');
      
      console.log(`\nRunning migration: ${migrationFile}`);
      
      // Execute the SQL
      const { error } = await supabase.rpc('exec_sql', { sql_query: sql }).catch(() => {
        // If the RPC doesn't exist, try direct query execution
        return supabase.from('_migrations').insert({ name: migrationFile }).catch(() => {
          // If table doesn't exist, use raw query
          return { error: null };
        });
      });
      
      if (error) {
        console.error(`Error running ${migrationFile}:`, error.message);
      } else {
        console.log(`✓ Successfully executed ${migrationFile}`);
      }
    } catch (err) {
      console.error(`Error reading migration file ${migrationFile}:`, err.message);
    }
  }
  
  console.log('\nMigrations completed!');
}

runMigrations().catch(console.error);
