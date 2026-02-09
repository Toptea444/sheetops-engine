

## Fix: Chart Breaking Right Side When Multiple Sheets Are Selected

### Problem
When the new Feb sheet is selected alongside the Jan sheet, the chart has ~20+ data points spanning Jan 16 to Feb 15. Recharts calculates the X-axis tick label positions and the chart's internal SVG width exceeds the visible container, causing it to overflow on the right side. The `overflow-hidden` on the wrapper clips the content but cuts off the last few data points and the right edge of the chart.

### Root Cause
1. The `YAxis width={45}` combined with `margin left: -20` creates a tight layout that leaves almost no right-side breathing room
2. When there are 20+ data points, the X-axis tick labels (even with interval skipping) push the chart content wider than the container
3. The `right: 5` margin is too small for the last tick label which may overflow

### Solution

**File: `src/components/dashboard/TrendChart.tsx`**

1. **Increase right margin** from `5` to `10-15` to give the last data point and label room
2. **Use shorter date labels** -- change `formatShortDate` to extract just the day number (e.g., "16", "17") instead of longer text like "Jan 16" to reduce label width
3. **Add `min-width: 0`** to the chart wrapper div to ensure the flex/grid child properly constrains its width (this is a common CSS fix for flex children with overflow)
4. **Increase the interval divisor** for large datasets so fewer ticks render

Changes to make:
- Update the chart container div to include `min-w-0` class
- Change `formatShortDate` to return just the day number for compact display
- Adjust `AreaChart` margin to `{ top: 5, right: 15, left: -15, bottom: 0 }`
- Update the interval calculation to be more aggressive for 20+ data points: use `Math.floor(chartData.length / 5)` for large sets

### Technical Details

```text
Before: margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
After:  margin={{ top: 5, right: 15, left: -15, bottom: 0 }}

Before: formatShortDate returns "Jan 16" (long)
After:  formatShortDate returns "16" or "Jan 16" only at month boundaries

Container: add min-w-0 class to prevent flex overflow
```

This is a small, focused change to `TrendChart.tsx` only.

