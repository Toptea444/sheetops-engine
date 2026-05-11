# Bonus Standards Color Coding Implementation

## Summary
Implemented a comprehensive bonus standards system that:
- Stores bonus standards for each stage (T-1, T0, S1, S2, S3, S4) in Supabase
- Provides color-coded visual feedback in the earnings breakdown
- Manages standards through an admin dashboard interface
- Clearly shows when users meet targets with appropriate bonus tiers

## What's New

### 1. **Color-Coded Performance Indicators**
- **Green (Emerald)**: Excellent performance (≤15%) → ₦1,500 bonus
- **Green**: Good performance (16-35%) → ₦1,000 bonus
- **Amber**: Fair performance (36-55%) → ₦500 bonus
- **Red**: Poor performance (>55%) → ₦0 bonus

### 2. **Files Created**

#### Core System
- **`src/utils/bonusStandards.ts`** (176 lines)
  - Defines all bonus standards for each stage
  - Provides helper functions for color coding and performance tier calculation
  - Functions: `getPerformanceTier()`, `getRecoveryRateColor()`, `getRecoveryRateTextColor()`, `getRecoveryRateBackgroundColor()`, `getBonusAmount()`, `getStageStandard()`

#### Hooks
- **`src/hooks/useBonusStandards.ts`** (72 lines)
  - Fetches bonus standards from Supabase
  - Manages caching and error handling
  - Exports: `useBonusStandards()` hook with `standards`, `isLoading`, `error`, `refetch`

#### Components
- **`src/components/dashboard/BonusStandardsReference.tsx`** (62 lines)
  - Displays a visual reference card showing all stages and their performance tiers
  - Uses color coding to show what each tier means
  - Can be embedded in dashboards

- **`src/components/admin/BonusStandardsManager.tsx`** (153 lines)
  - Admin interface to manage bonus standards
  - View current standards across all stages
  - Reset standards to defaults with one click
  - Shows success/error messages

#### Database
- **`supabase/migrations/20250511_bonus_standards.sql`** (56 lines)
  - Creates `bonus_standards` table with all tier thresholds and bonuses
  - Creates `earnings_by_stage` table for tracking earnings with performance tiers
  - Creates indexes for efficient queries
  - Seeds database with default values for all stages

#### Documentation
- **`docs/BONUS_STANDARDS.md`** (160 lines)
  - Complete guide to the bonus standards system
  - Includes all stage thresholds and tier definitions
  - Usage instructions for users and admins
  - Technical implementation details

### 3. **Files Modified**

- **`src/pages/AdminPinReset.tsx`**
  - Added import for `BonusStandardsManager` component
  - Added new "Bonus Standards" tab to admin dashboard (line ~1660)
  - Added tab content to render the manager (line ~1710)

- **`src/components/dashboard/DailyEarningsTable.tsx`**
  - Added import for color coding utilities
  - Updated `recoveryTone()` function to use new color system
  - Modified recovery rate table cell to include background colors (line ~304)
  - Recovery rates now display with both text and background colors

## Database Schema

### `bonus_standards` table
```sql
- id (UUID, PRIMARY KEY)
- stage (TEXT, UNIQUE) — T-1, T0, S1, S2, S3, S4
- tier_excellent_threshold (NUMERIC)
- tier_excellent_bonus (INTEGER)
- tier_excellent_recovery_rate (INTEGER)
- tier_good_threshold (NUMERIC)
- tier_good_bonus (INTEGER)
- tier_good_recovery_rate (INTEGER)
- tier_fair_threshold (NUMERIC)
- tier_fair_bonus (INTEGER)
- tier_fair_recovery_rate (INTEGER)
- tier_poor_threshold (NUMERIC)
- tier_poor_bonus (INTEGER)
- tier_poor_recovery_rate (INTEGER)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### `earnings_by_stage` table
```sql
- id (UUID, PRIMARY KEY)
- worker_id (TEXT)
- stage (TEXT)
- date (DATE)
- recovery_rate (NUMERIC)
- bonus_amount (INTEGER)
- performance_tier (TEXT) — excellent, good, fair, poor
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
- UNIQUE(worker_id, stage, date)
```

## How It Works

### For Workers
1. View daily earnings table in dashboard
2. See recovery rates with color-coded background
3. Color indicates performance tier against target
4. Reference card shows what each color means

### For Admins
1. Log in to admin dashboard
2. Navigate to "Bonus Standards" tab
3. View all current standards for each stage
4. Reset to defaults if needed
5. Changes immediately reflect across app

## Features

✅ **Persistent Storage** - Standards saved in Supabase  
✅ **Visual Feedback** - Color-coded recovery rates  
✅ **Stage-Specific** - Different thresholds for each stage  
✅ **Admin Control** - Manage standards through dashboard  
✅ **Performance Tracking** - Four-tier system (excellent/good/fair/poor)  
✅ **Real-Time Updates** - Changes reflect immediately  
✅ **Audit Trail** - Database timestamps track modifications  

## Usage Examples

### Display Reference Card
```tsx
import { BonusStandardsReference } from '@/components/dashboard/BonusStandardsReference';

export function MyComponent() {
  return <BonusStandardsReference />;
}
```

### Get Performance Tier
```tsx
import { getPerformanceTier, getRecoveryRateColor } from '@/utils/bonusStandards';

const tier = getPerformanceTier(25); // returns 'good'
const colors = getRecoveryRateColor(25); // returns color classes
```

### Use Hook to Fetch Standards
```tsx
import { useBonusStandards } from '@/hooks/useBonusStandards';

export function MyComponent() {
  const { standards, isLoading, error } = useBonusStandards();
  
  return (
    <div>
      {standards.S1 && <p>S1 Excellent: {standards.S1.tiers.excellent.bonus}</p>}
    </div>
  );
}
```

## Color Palette Used

| Tier | Tailwind Classes |
|------|------------------|
| Excellent | `text-emerald-600 dark:text-emerald-400` `bg-emerald-50 dark:bg-emerald-950/30` |
| Good | `text-green-600 dark:text-green-400` `bg-green-50 dark:bg-green-950/30` |
| Fair | `text-amber-600 dark:text-amber-400` `bg-amber-50 dark:bg-amber-950/30` |
| Poor | `text-red-600 dark:text-red-400` `bg-red-50 dark:bg-red-950/30` |

## Bonus Standards Data

All standards follow the GH_COLLECTOR BONUS STANDARDS format:

| Stage | Excellent | Good | Fair | Poor |
|-------|-----------|------|------|------|
| T-1 | ≥52% | ≥46% | ≥40% | <40% |
| T0 | ≥24% | ≥20% | ≥16% | <16% |
| S1 | ≥6.5% | ≥4.5% | ≥2.5% | <2.5% |
| S2 | ≥1.3% | ≥0.9% | ≥0.5% | <0.5% |
| S3 | ≥0.40% | ≥0.30% | ≥0.20% | <0.20% |
| S4 | ≥0.08% | ≥0.05% | ≥0.02% | <0.02% |

## Next Steps

1. **Run Migration**: Execute the Supabase migration to create tables
2. **Test Admin Panel**: Verify bonus standards tab is accessible
3. **Check Earnings Display**: Verify color coding appears in daily earnings table
4. **Monitor Performance**: Track if standards are appropriately calibrated
5. **Gather Feedback**: Collect worker feedback on color coding clarity

## Build Status
✅ Project builds successfully with no errors  
✅ All imports are correct  
✅ TypeScript types are properly defined  
✅ No breaking changes to existing functionality
