# Bonus Standards System - Deployment Guide

## Prerequisites
- Supabase project connected
- Admin access to the application
- Git access to the repository

## Step 1: Run Database Migration

The migration creates the necessary tables and seeds default bonus standards.

### Option A: Using Supabase Dashboard
1. Go to your Supabase project
2. Navigate to SQL Editor
3. Open the migration file: `supabase/migrations/20250511_bonus_standards.sql`
4. Copy the entire SQL code
5. Paste into Supabase SQL Editor
6. Click "Run"
7. Verify both tables are created:
   - `bonus_standards` (should have 6 rows for T-1, T0, S1, S2, S3, S4)
   - `earnings_by_stage` (empty initially)

### Option B: Using Supabase CLI (if configured)
```bash
supabase migration up
```

## Step 2: Verify Migration

Check that the migration created tables correctly:

```sql
-- Check bonus_standards table
SELECT * FROM bonus_standards ORDER BY stage;

-- Should return 6 rows (one for each stage)
-- Verify all tiers are populated with correct thresholds
```

Expected output:
- T-1 with thresholds: 0.52, 0.46, 0.40
- T0 with thresholds: 0.24, 0.20, 0.16
- S1 with thresholds: 0.065, 0.045, 0.025
- S2 with thresholds: 0.013, 0.009, 0.005
- S3 with thresholds: 0.004, 0.003, 0.002
- S4 with thresholds: 0.0008, 0.0005, 0.0002

## Step 3: Deploy Application

### Using Vercel
1. Commit and push changes to your repository
   ```bash
   git add .
   git commit -m "feat: Add bonus standards color coding system"
   git push
   ```

2. Vercel will automatically deploy on push
3. Wait for deployment to complete
4. Verify application is running

### Using GitHub
1. Create a pull request with the changes
2. Merge to main branch
3. Vercel deployment will trigger automatically

## Step 4: Test in Application

### For Regular Users
1. Log in to the main dashboard
2. Navigate to daily earnings table
3. **Verify**: Recovery rates have colors (green/amber/red)
4. **Verify**: Colors match the expected tier
5. Open the "Bonus Standards Reference" card
6. **Verify**: All stages show with proper color coding

### For Admins
1. Log in to admin dashboard (`/admin-pin-reset`)
2. Navigate to the "Bonus Standards" tab
3. **Verify**: Can see all stages and their thresholds
4. **Verify**: Thresholds match expected values
5. Click "Refresh" button - should load standards from DB
6. Optionally click "Reset to Defaults" to test update functionality

## Step 5: Monitor and Validate

### Check Database
```sql
-- Verify standards are being used
SELECT COUNT(*) FROM bonus_standards;
-- Should return 6

-- Verify structure
\d bonus_standards;
-- Should show all 13 columns
```

### Check Application Logs
- Look for any errors related to bonus standards
- Check that recovery rate colors are applying correctly
- Monitor performance of color coding feature

## Rollback Procedure

If issues occur, you can rollback:

### Option 1: Revert Code Changes
```bash
git revert <commit-hash>
git push
# Vercel will automatically redeploy
```

### Option 2: Drop Migration (Last Resort)
Only do this if absolutely necessary:

```sql
-- In Supabase SQL Editor, carefully run:
DROP TABLE IF EXISTS earnings_by_stage CASCADE;
DROP TABLE IF EXISTS bonus_standards CASCADE;
```

Then redeploy application without the feature.

## Troubleshooting

### Issue: Recovery rates not showing colors
**Solution:**
1. Clear browser cache
2. Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
3. Check browser console for errors
4. Verify CSS is loading correctly

### Issue: Admin tab not visible
**Solution:**
1. Verify you have admin authentication
2. Check that `BonusStandardsManager` component is imported in `AdminPinReset.tsx`
3. Verify migration created `bonus_standards` table
4. Check admin dashboard for any console errors

### Issue: Standards not loading
**Solution:**
1. Verify Supabase connection is working
2. Check network tab in browser dev tools
3. Verify `bonus_standards` table has data
4. Check Supabase RLS policies aren't blocking reads

### Issue: Colors not matching expected tiers
**Solution:**
1. Verify recovery rate values in database
2. Check Tailwind CSS is loading (`getRecoveryRateColor()` uses Tailwind classes)
3. Verify dark mode is working correctly
4. Check browser dev tools for CSS issues

## Configuration

### Changing Color Scheme
Colors are defined in `src/utils/bonusStandards.ts` in these functions:
- `getRecoveryRateColor()` - Returns combined text + background
- `getRecoveryRateTextColor()` - Text color only
- `getRecoveryRateBackgroundColor()` - Background color only

To change colors, modify the Tailwind class strings returned by these functions.

### Adjusting Tier Thresholds
1. Modify `BONUS_STANDARDS` object in `src/utils/bonusStandards.ts`
2. Run migration to update database
3. Or use Admin Dashboard "Reset to Defaults" button

### Updating Bonus Amounts
1. Edit `tiers.{tier}.bonus` values in `BONUS_STANDARDS`
2. Update corresponding fields in migration file
3. Reset standards in admin dashboard

## Performance Notes

- Color coding calculations are lightweight (simple number comparisons)
- Supabase queries are indexed on `stage` column
- No significant performance impact expected
- Migration includes indexes for efficient queries

## Security Considerations

- Admin panel is protected by admin secret authentication
- Standards reset requires admin access
- No public-facing ability to modify standards
- Database changes are audited via timestamps

## Next Steps After Deployment

1. **Monitor**: Watch for any errors or issues
2. **Communicate**: Inform workers about new color coding system
3. **Train**: Ensure admins know how to manage standards
4. **Gather Feedback**: Collect worker feedback on clarity
5. **Review**: Check if standards are appropriately calibrated
6. **Document**: Keep this deployment guide updated

## Support

If you encounter issues not covered here:
1. Check the comprehensive guide in `docs/BONUS_STANDARDS.md`
2. Review color coding guide in `COLOR_CODING_GUIDE.md`
3. Check implementation details in `BONUS_STANDARDS_IMPLEMENTATION.md`
4. Review source code comments for additional context
