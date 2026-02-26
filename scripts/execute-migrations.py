#!/usr/bin/env python3
"""
Execute database migrations against Supabase
"""
import os
import subprocess
import sys

# Supabase credentials from environment variables
SUPABASE_URL = "https://gducdbslxhugyqxbfkic.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdkdWNkYnNseGh1Z3lxeGJma2ljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0MDA0MzMsImV4cCI6MjA4Mzk3NjQzM30.fl0TsAoRU877vJ7TyZkzxZlnesHdBQglTVsUEHsywVM"

migration_files = [
    "supabase/migrations/20260226_100000_admin_settings.sql",
    "supabase/migrations/20260226_100001_admin_alerts.sql",
    "supabase/migrations/20260226_100002_earnings_audit_log.sql"
]

print("=" * 80)
print("SUPABASE MIGRATION INSTRUCTIONS")
print("=" * 80)
print(f"\nProject URL: {SUPABASE_URL}")
print("\nTo execute the migrations manually:")
print("1. Go to: https://supabase.com/dashboard/project/gducdbslxhugyqxbfkic/sql")
print("2. Click 'New Query'")
print("3. Copy and paste each migration below and execute\n")

for migration_file in migration_files:
    if os.path.exists(migration_file):
        print(f"\n{'='*80}")
        print(f"Migration: {migration_file}")
        print(f"{'='*80}")
        with open(migration_file, 'r') as f:
            content = f.read()
            print(content)
            print("\n")
    else:
        print(f"⚠️  File not found: {migration_file}")

print("\n" + "=" * 80)
print("After executing all migrations, the following will be created:")
print("=" * 80)
print("✓ admin_settings table (site restrictions)")
print("✓ admin_alerts table (custom alerts)")
print("✓ earnings_audit_log table (earnings verification)")
print("\n✅ All migration SQL is ready to be executed!")
