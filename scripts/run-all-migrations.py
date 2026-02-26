#!/usr/bin/env python3
import os
import sys

# Read migration files
migration_files = [
    '/vercel/share/v0-project/supabase/migrations/20260226_100000_admin_settings.sql',
    '/vercel/share/v0-project/supabase/migrations/20260226_100001_admin_alerts.sql',
    '/vercel/share/v0-project/supabase/migrations/20260226_100002_earnings_audit_log.sql'
]

print("=" * 80)
print("SUPABASE DATABASE MIGRATIONS")
print("=" * 80)
print()
print("🔗 Supabase Project URL: https://gducdbslxhugyqxbfkic.supabase.co")
print()
print("To execute these migrations manually:")
print("1. Go to: https://supabase.com/dashboard/project/gducdbslxhugyqxbfkic/sql")
print("2. Click 'New Query'")
print("3. Copy and paste each SQL block below and execute")
print()
print("=" * 80)

for i, file_path in enumerate(migration_files, 1):
    if os.path.exists(file_path):
        with open(file_path, 'r') as f:
            sql = f.read()
        print(f"\n📝 MIGRATION {i}: {os.path.basename(file_path)}")
        print("-" * 80)
        print(sql)
        print("-" * 80)
    else:
        print(f"\n❌ File not found: {file_path}")

print()
print("=" * 80)
print("SUMMARY OF CHANGES")
print("=" * 80)
print("✅ admin_settings table")
print("   - Stores site-wide configuration settings")
print("   - Default settings: site_restricted, currency_symbol")
print()
print("✅ admin_alerts table")
print("   - For custom site-wide alerts (info, warning, error, success)")
print("   - Can be scheduled with start_date and end_date")
print("   - Indexed for fast queries")
print()
print("✅ earnings_audit_log table")
print("   - Tracks all payment calculations and adjustments")
print("   - Supports verification workflow")
print("   - Indexed by worker_id, sheet_name, status, and created_at")
print()
print("=" * 80)
