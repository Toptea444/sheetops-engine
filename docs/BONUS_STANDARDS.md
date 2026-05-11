# Bonus Standards System

## Overview

The Bonus Standards system tracks and color-codes worker performance based on recovery rates across different stages (T-1, T0, S1, S2, S3, S4). This system ensures consistent and transparent evaluation of earnings performance.

## Color Coding System

Performance tiers are indicated by colors in the earnings breakdown:

| Tier | Recovery Rate | Color | Bonus Amount | Rating |
|------|---------------|-------|--------------|--------|
| **Excellent** | ≤15% | 🟢 Emerald Green | ₦1,500 | Top performer |
| **Good** | 16-35% | 🟢 Green | ₦1,000 | Good performance |
| **Fair** | 36-55% | 🟡 Amber | ₦500 | Fair performance |
| **Poor** | >55% | 🔴 Red | ₦0 | Below target |

**Lower recovery rates are better** - they indicate better performance against targets.

## Stage Standards

Each stage has specific recovery rate thresholds that determine bonus tiers:

### T-1 (Pre-Launch)
- Excellent: ≥52%
- Good: ≥46%
- Fair: ≥40%
- Poor: <40%

### T0 (Launch Stage)
- Excellent: ≥24%
- Good: ≥20%
- Fair: ≥16%
- Poor: <16%

### S1 (Stage 1)
- Excellent: ≥6.5%
- Good: ≥4.5%
- Fair: ≥2.5%
- Poor: <2.5%

### S2 (Stage 2)
- Excellent: ≥1.3%
- Good: ≥0.9%
- Fair: ≥0.5%
- Poor: <0.5%

### S3 (Stage 3)
- Excellent: ≥0.40%
- Good: ≥0.30%
- Fair: ≥0.20%
- Poor: <0.20%

### S4 (Stage 4)
- Excellent: ≥0.08%
- Good: ≥0.05%
- Fair: ≥0.02%
- Poor: <0.02%

## Viewing Standards

### For Users
- View bonus standards in the **"Bonus Standards by Stage"** reference card in the dashboard
- Each card shows the four performance tiers with color coding
- See daily recovery rates highlighted with corresponding colors in the earnings table

### For Admins
- Access the **"Bonus Standards"** tab in the admin dashboard
- View all current standards across all stages
- Reset standards to defaults if needed
- Standards are stored in the Supabase `bonus_standards` table

## Managing Standards

### Resetting to Defaults
1. Go to Admin Dashboard (requires admin authentication)
2. Click on the "Bonus Standards" tab
3. Click "Reset to Defaults" button
4. Confirm the action

This will restore all standards to the predefined values defined in `GH_COLLECTOR BONUS STANDARDS`.

## Implementation Details

### Files & Structure

**Utility Files:**
- `src/utils/bonusStandards.ts` - Core standards definitions and helper functions
- `src/hooks/useBonusStandards.ts` - Hook for fetching standards from Supabase

**Components:**
- `src/components/dashboard/DailyEarningsTable.tsx` - Displays recovery rates with color coding
- `src/components/dashboard/BonusStandardsReference.tsx` - Shows reference card of all standards
- `src/components/admin/BonusStandardsManager.tsx` - Admin interface for managing standards

**Database:**
- `supabase/migrations/20250511_bonus_standards.sql` - Migration creating tables and inserting defaults

### Color Coding Functions

```typescript
// Get performance tier based on recovery rate
getPerformanceTier(recoveryRate?: number): 'excellent' | 'good' | 'fair' | 'poor'

// Get full color styling (text + background)
getRecoveryRateColor(recoveryRate?: number): string

// Get text color only
getRecoveryRateTextColor(recoveryRate?: number): string

// Get background color only
getRecoveryRateBackgroundColor(recoveryRate?: number): string

// Get bonus amount for a stage and recovery rate
getBonusAmount(stage: string, recoveryRate?: number): number
```

### API Integration

Standards are stored in Supabase:

```sql
-- Table: bonus_standards
- stage (TEXT, UNIQUE)
- tier_excellent_threshold (NUMERIC)
- tier_excellent_bonus (INTEGER)
- tier_excellent_recovery_rate (INTEGER)
- ... (similar fields for good, fair, poor tiers)
- created_at, updated_at (TIMESTAMP)
```

## Customization

To modify or add new standards:

1. Update `src/utils/bonusStandards.ts` with new stage definitions
2. Run the migration to update the database
3. Reset standards in the admin dashboard
4. Changes will be reflected across all dashboards and tables

## User Experience

### For Workers/Collectors
- See color-coded recovery rates in their daily earnings breakdown
- Reference card shows what each color means and corresponding bonuses
- Easy to understand performance feedback

### For Admins
- Centralized management of bonus standards
- Audit trail of when standards were reset
- Real-time updates across all users

## Best Practices

1. **Regular Reviews**: Review bonus standards quarterly to ensure they reflect current business goals
2. **Consistency**: Keep the four-tier system (excellent/good/fair/poor) across all stages
3. **Communication**: Always communicate standard changes to workers in advance
4. **Monitoring**: Track which tier most workers fall into to identify if standards are calibrated correctly
5. **Backup**: Migration file serves as version control for bonus standards history
