#!/usr/bin/env python3
import os
import subprocess
import sys

# Get Supabase credentials from environment
supabase_url = os.environ.get('VITE_SUPABASE_URL')
supabase_key = os.environ.get('VITE_SUPABASE_PUBLISHABLE_KEY')

if not supabase_url or not supabase_key:
    print("ERROR: Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY")
    print("Please set these environment variables first")
    sys.exit(1)

# Extract project ID from URL
# Format: https://[project-id].supabase.co
project_id = supabase_url.split('//')[1].split('.')[0]

print(f"Supabase Project: {project_id}")
print(f"URL: {supabase_url}")

# Migration files to run (in order)
migrations = [
    '20260226_100000_admin_settings.sql',
    '20260226_100001_admin_alerts.sql', 
    '20260226_100002_earnings_audit_log.sql',
]

migrations_dir = 'supabase/migrations'

# Read and execute each migration
for migration_file in migrations:
    migration_path = os.path.join(migrations_dir, migration_file)
    
    if not os.path.exists(migration_path):
        print(f"⚠ Migration file not found: {migration_path}")
        continue
    
    print(f"\n📝 Running migration: {migration_file}")
    
    with open(migration_path, 'r') as f:
        sql_content = f.read()
    
    # Execute using psql via supabase-cli or direct REST API
    # For this example, we'll print the SQL that needs to be executed
    print(f"SQL to execute ({len(sql_content)} characters):")
    print("─" * 60)
    print(sql_content)
    print("─" * 60)
    print(f"✓ Migration content loaded: {migration_file}")

print("\n✅ All migration files have been prepared!")
print("\nTo apply these migrations to your Supabase database:")
print("1. Go to your Supabase project dashboard")
print("2. Navigate to SQL Editor")
print("3. Copy and paste each migration SQL into the editor")
print("4. Execute them in order")
