import { useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
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
}

const playfulCardThemes = [
  'bg-[linear-gradient(145deg,hsl(330_92%_86%)_0%,hsl(330_84%_91%)_100%)] border-pink-300/70',
  'bg-[linear-gradient(145deg,hsl(205_80%_82%)_0%,hsl(205_80%_90%)_100%)] border-sky-300/70',
  'bg-[linear-gradient(145deg,hsl(148_55%_80%)_0%,hsl(148_60%_89%)_100%)] border-emerald-300/70',
  'bg-[linear-gradient(145deg,hsl(50_98%_78%)_0%,hsl(50_95%_88%)_100%)] border-yellow-300/70',
  'bg-[linear-gradient(145deg,hsl(269_74%_86%)_0%,hsl(269_76%_92%)_100%)] border-violet-300/70',
];

export function SheetBreakdownCards({
  results,
  sheetNames,
  cycle,
  isLoading,
  displayMode = 'amount',
  subsidyData,
  subsidyOptedIn,
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
      <div className="flex gap-3 overflow-x-auto pb-1">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-32 shrink-0" />
        ))}
      </div>
    );
  }

  if (sheetBreakdown.length === 0 && !subsidyOptedIn) return null;

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
      {sheetBreakdown.map((sheet, index) => (
        <div 
          key={sheet.name} 
          className={`shrink-0 px-3 py-2.5 rounded-2xl border-2 min-w-[132px] shadow-[0_6px_0_rgba(15,23,42,0.08)] ${playfulCardThemes[index % playfulCardThemes.length]}`}
        >
          <div className="flex items-center gap-2 mb-1">
            <p className="text-xs font-semibold text-foreground/75 truncate max-w-[110px]">
              {sheet.name.split(' ')[0]}
            </p>
            {sheet.isPercent && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">%</Badge>
            )}
          </div>
          {displayMode === 'dots' ? (
            <div className="h-5 w-16 rounded-md bg-muted animate-pulse mt-0.5" />
          ) : (
            <p className="text-base font-extrabold text-foreground">
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
        <div className="shrink-0 px-3 py-2.5 rounded-2xl border-2 border-rose-300/70 min-w-[132px] bg-[linear-gradient(145deg,hsl(20_100%_88%)_0%,hsl(330_92%_92%)_100%)] shadow-[0_6px_0_rgba(15,23,42,0.08)]">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-xs font-semibold text-foreground/75 truncate max-w-[110px]">
              Transport
            </p>
          </div>
          {displayMode === 'dots' ? (
            <div className="h-5 w-16 rounded-md bg-muted animate-pulse mt-0.5" />
          ) : (
            <p className="text-base font-extrabold text-foreground">
              {subsidyData ? `₦${subsidyData.actualSubsidy.toLocaleString()}` : '—'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
