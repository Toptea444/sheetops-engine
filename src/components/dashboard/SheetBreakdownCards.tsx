import { useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { FileSpreadsheet } from 'lucide-react';
import type { BonusResult } from '@/types/bonus';
import type { CyclePeriod } from '@/lib/cycleUtils';
import { isDateInCycle } from '@/lib/cycleUtils';
import type { TransportSubsidyData } from '@/hooks/useTransportSubsidy';

import type { EarningsDisplayMode } from '@/hooks/useDisplayMode';

interface SheetBreakdownCardsProps {
  results: BonusResult[];
  sheetNames: string[];
  cycle: CyclePeriod;
  isLoading?: boolean;
  displayMode?: EarningsDisplayMode;
  subsidyData?: TransportSubsidyData | null;
  subsidyOptedIn?: boolean;
  formerWorkerId?: string | null;
}

export function SheetBreakdownCards({
  results,
  sheetNames,
  cycle,
  isLoading,
  displayMode = 'amount',
  subsidyData,
  subsidyOptedIn,
  formerWorkerId,
}: SheetBreakdownCardsProps) {
  const sheetBreakdown = useMemo(() => {
    return sheetNames.map((name) => {
      const matchingResults = results.filter(r => r.sheetName === name);
      const isPercent = matchingResults[0]?.valueType === 'percent';
      
      let total = 0;
      let daysCount = 0;
      
      matchingResults.forEach(result => {
        result.dailyBreakdown?.forEach((day) => {
          if (day.fullDate === undefined) return;
          const dayDate = new Date(day.fullDate);
          if (isDateInCycle(dayDate, cycle)) {
            total += day.value;
            if (day.value > 0) daysCount++;
          }
        });
      });

      return { name, total, daysCount, isPercent };
    });
  }, [sheetNames, results, cycle]);

  if (isLoading) {
    return (
      <div className="flex gap-3 overflow-x-auto pb-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28 w-56 shrink-0 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (sheetBreakdown.length === 0 && !subsidyOptedIn) return null;

  // Check if a sheet is the June 16-21 sheet
  const isJune1621Sheet = (sheetName: string): boolean => {
    const upper = sheetName.toUpperCase();
    return upper.includes('JUNE') && (upper.includes('16') || upper.includes('21'));
  };

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {sheetBreakdown.map((sheet) => (
        <div 
          key={sheet.name} 
          className="w-56 shrink-0 rounded-2xl border border-border/70 bg-card p-4 shadow-sm"
        >
          <div className="mb-4 flex min-w-0 items-start gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><FileSpreadsheet className="h-4 w-4" /></span>
            <p className="min-w-0 flex-1 break-words text-xs font-medium leading-4 text-muted-foreground" title={sheet.name}>
              {sheet.name}
            </p>
            {sheet.isPercent && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">%</Badge>
            )}
          </div>
          {isJune1621Sheet(sheet.name) && formerWorkerId && (
            <p className="text-xs text-muted-foreground mb-1">
              {formerWorkerId}
            </p>
          )}
          {displayMode === 'dots' ? (
            <div className="h-5 w-16 rounded-md bg-muted animate-pulse mt-0.5" />
          ) : (
            <p className="break-all text-xl font-bold tracking-tight tabular-nums">
              {sheet.isPercent 
                ? `${sheet.total.toFixed(1)}%`
                : `₦${sheet.total.toLocaleString()}`
              }
            </p>
          )}
        </div>
      ))}

      {/* Transport Subsidy card */}
      {subsidyOptedIn && (
        <div className="shrink-0 px-3 py-2.5 rounded-lg border bg-card/70 min-w-[132px]">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-xs text-muted-foreground truncate max-w-[110px]">
              Transport
            </p>
          </div>
          {displayMode === 'dots' ? (
            <div className="h-5 w-16 rounded-md bg-muted animate-pulse mt-0.5" />
          ) : (
            <p className="text-base font-semibold">
              {subsidyData ? `₦${subsidyData.actualSubsidy.toLocaleString()}` : '—'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
