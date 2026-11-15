# Weekly bonus tracking — paused

## Requested behavior

- Track weekly bonus data from stage spreadsheets, including S1 New and T0. Tab names can vary: recognise safe weekly-bonus name variations (for example, names beginning with “Weekly Bonus”), and verify the expected block layout instead of relying on the exact name. The currently identified tab in both spreadsheets is `Weekly Bonus 2`.
- Each week is a horizontal block: week label, worker ID column (example header `S1 NEW`), daily date/percentage columns, `TOTAL` percentage, and `AMOUNT`. The worker may be on a different row in each block. See the screenshot shared in the conversation for the layout.
- In the existing earnings breakdown, provide a weekly bonus tab with rows for each week and columns **Week**, **Total (%)**, and **Amount**, matching the existing per-date table style.
- Add weekly bonus amounts to Total Earnings. Do not add percentages as currency.
- For a week containing both a worker's old and new IDs, show both entries and their full amounts; do not split the amounts. **Caution:** where an ID is reassigned midweek, a full weekly amount can contain another person's activity. The weekly aggregate alone cannot establish how much belongs to each person; resolve this privacy/correctness risk before implementing ownership logic.
- Replace the existing incorrect weekly parser and remove the “Weekly Bonus Not Tracked” notice when the feature actually works.

## Open decision

A weekly block can cross the app's 16th–15th earnings-cycle boundary (the screenshot's example is October 12–18). The user was asked whether the entire amount should be assigned to the cycle containing the **week's start** or **week's end**. They have not answered yet. Do not silently split or double-count the amount.

## Implementation context

- `src/hooks/useGoogleSheets.ts`: existing weekly parser expects username-style columns and doesn't match the screenshot.
- `src/components/dashboard/DailyEarningsTable.tsx`: current per-date earnings breakdown and sheet tabs.
- `src/pages/Index.tsx`: weekly sheets are currently unchecked by default, excluded from some totals, and hidden for past cycles. Review all such paths when integrating.
- `src/components/dashboard/WeeklyBonusAlert.tsx`: existing untracked notice.
- `src/hooks/useEarningsAdjustments.ts` and `src/lib/swapOwnership.ts`: directional ID ownership and earnings adjustments. Preserve their privacy safeguards; do not treat swaps as a bidirectional graph.
- Review weekly/daily charts and cached historical results so weekly amounts are not incorrectly presented as a day's earnings or counted twice. Do not assume live spreadsheet access: the screenshot and code were inspected, not the live data.

No implementation has been started. The user asked to pause and return to this feature later.
