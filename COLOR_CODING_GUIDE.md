# Bonus Standards Color Coding Guide

## Quick Reference

This guide shows how recovery rates are color-coded to give instant visual feedback on worker performance.

### The Four Tiers

```
┌─────────────────────────────────────────────────────────────┐
│                    PERFORMANCE TIERS                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  🟢 EXCELLENT (Emerald Green)                                │
│  Recovery Rate: ≤15%                                         │
│  Bonus: ₦1,500                                              │
│  Performance: TOP TIER - Target exceeded significantly       │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  🟢 GOOD (Green)                                             │
│  Recovery Rate: 16-35%                                       │
│  Bonus: ₦1,000                                              │
│  Performance: ABOVE AVERAGE - Target met well                │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  🟡 FAIR (Amber)                                             │
│  Recovery Rate: 36-55%                                       │
│  Bonus: ₦500                                                │
│  Performance: ACCEPTABLE - Target met partially              │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  🔴 POOR (Red)                                               │
│  Recovery Rate: >55%                                         │
│  Bonus: ₦0                                                  │
│  Performance: BELOW TARGET - Needs improvement               │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Understanding Recovery Rates

**Lower recovery rates = Better performance**

Recovery rate shows what percentage of target collections were "recovered" (not yet completed). A lower percentage means more of the target was achieved.

### Example Interpretations

| Recovery Rate | Meaning | Color |
|---|---|---|
| 10% | 90% of target achieved ✓ | 🟢 Emerald Green |
| 25% | 75% of target achieved ✓ | 🟢 Green |
| 45% | 55% of target achieved | 🟡 Amber |
| 70% | Only 30% of target achieved | 🔴 Red |

## Stage-Specific Thresholds

Each stage has different thresholds because later stages have different targets:

### Early Stages (T-1, T0)
```
T-1: 52% | 46% | 40% ── Recovery Rate thresholds
     ↓     ↓     ↓
     🟢    🟢    🟡      Performance color
T0:  24% | 20% | 16% ── Recovery Rate thresholds
     ↓     ↓     ↓
     🟢    🟢    🟡      Performance color
```

### Middle Stages (S1, S2)
```
S1:  6.5% | 4.5% | 2.5% ── Recovery Rate thresholds
     ↓      ↓      ↓
     🟢     🟢     🟡      Performance color
S2:  1.3% | 0.9% | 0.5% ── Recovery Rate thresholds
     ↓      ↓      ↓
     🟢     🟢     🟡      Performance color
```

### Late Stages (S3, S4)
```
S3:  0.40% | 0.30% | 0.20% ── Recovery Rate thresholds
     ↓       ↓       ↓
     🟢      🟢      🟡       Performance color
S4:  0.08% | 0.05% | 0.02% ── Recovery Rate thresholds
     ↓       ↓       ↓
     🟢      🟢      🟡       Performance color
```

## Dashboard Display

### In Daily Earnings Table

When you view your daily earnings:

```
Date     | Target Met | Bonus
---------|------------|--------
Day 1    | 12% 🟢    | ₦1,500
Day 2    | 28% 🟢    | ₦1,000
Day 3    | 45% 🟡    | ₦500
Day 4    | 68% 🔴    | ₦0
```

The recovery rate is displayed with:
- **Text Color**: Emerald (excellent), Green (good), Amber (fair), or Red (poor)
- **Background Color**: Matching light tint of the text color
- **Number**: The exact recovery rate percentage

### In Reference Card

The Bonus Standards Reference card shows all tiers for each stage:

```
┌─────────────────────────┐
│         S1              │
├─────────────────────────┤
│ 🟢 Excellent    ₦1,500  │
│    ≤ 6.5%               │
│                         │
│ 🟢 Good         ₦1,000  │
│    ≤ 4.5%               │
│                         │
│ 🟡 Fair         ₦500    │
│    ≤ 2.5%               │
│                         │
│ 🔴 Poor         ₦0      │
│    > 2.5%               │
└─────────────────────────┘
```

## What Workers Should Know

### ✓ Good News (Green)
- Excellent (🟢 Emerald): You're crushing it! Keep it up.
- Good (🟢 Green): Great performance! You're well above target.

### ⚠️ Needs Attention (Amber)
- Fair (🟡 Amber): You're close to target but have room to improve.

### ✗ Action Needed (Red)
- Poor (🔴 Red): Below target. Focus on hitting the recovery goals tomorrow.

## Admin Management

### Viewing Standards
1. Go to Admin Dashboard
2. Click "Bonus Standards" tab
3. See all current thresholds and bonuses

### Updating Standards
1. Admins can reset standards to defaults
2. Changes take effect immediately
3. All workers see updated color coding

## Technical Implementation

The system uses Tailwind CSS colors for:

| Tier | Tailwind Text | Tailwind Background |
|------|---------------|-------------------|
| Excellent | `text-emerald-600` | `bg-emerald-50` |
| Good | `text-green-600` | `bg-green-50` |
| Fair | `text-amber-600` | `bg-amber-50` |
| Poor | `text-red-600` | `bg-red-50` |

Colors automatically adjust for dark mode using `dark:` variants.

## Color Consistency

The color coding appears consistently across:
- ✓ Daily earnings tables
- ✓ Bonus standards reference cards
- ✓ Admin dashboard views
- ✓ Mobile and desktop displays
- ✓ Light and dark themes

## Accessibility Notes

- Color alone is not the only indicator (numbers are shown)
- Text colors have sufficient contrast
- Color names are written out (Excellent, Good, Fair, Poor)
- Emoji symbols (🟢🟡🔴) provide additional clarity
