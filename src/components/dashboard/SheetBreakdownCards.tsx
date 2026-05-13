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

  // Assign colors to each sheet for variety
  const colorClasses = [
    'cotton-candy-accent',
    'sky-accent',
    'mint-accent',
    'sunshine-accent',
  ];

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
      {sheetBreakdown.map((sheet, index) => {
        const colorClass = colorClasses[index % colorClasses.length];
        return (
          <div 
            key={sheet.name} 
            className={`shrink-0 ${colorClass} px-4 py-3 rounded-2xl min-w-[140px] soft-shadow`}
          >
            <div className="flex items-center gap-2 mb-2">
              <p className="text-xs font-bold text-white truncate max-w-[110px]">
                📊 {sheet.name.split(' ')[0]}
              </p>
              {sheet.isPercent && (
                <Badge variant="outline" className="text-[10px] px-2 py-0.5 h-5 bg-white/20 border-white/30 text-white font-bold">%</Badge>
              )}
            </div>
            {displayMode === 'dots' ? (
              <div className="h-6 w-16 rounded-lg bg-white/30 animate-pulse" />
            ) : (
              <p className="text-lg font-black text-white">
                {sheet.isPercent 
                  ? `${sheet.total.toFixed(1)}%`
                  : `₦${sheet.total.toLocaleString()}`
                }
              </p>
            )}
            <p className="text-xs font-bold text-white/80 mt-2">
              {sheet.daysCount === 1 ? '📅 1 day' : `📅 ${sheet.daysCount} days`}
            </p>
          </div>
        );
      })}

      {/* Transport Subsidy card - Special styling */}
      {subsidyOptedIn && (
        <div className="shrink-0 sunshine-accent px-4 py-3 rounded-2xl min-w-[140px] soft-shadow">
          <div className="flex items-center gap-2 mb-2">
            <p className="text-xs font-bold text-white truncate max-w-[110px]">
              🚗 Transport
            </p>
          </div>
          {displayMode === 'dots' ? (
            <div className="h-6 w-16 rounded-lg bg-white/30 animate-pulse" />
          ) : (
            <p className="text-lg font-black text-white">
              {subsidyData ? `₦${subsidyData.actualSubsidy.toLocaleString()}` : '—'}
            </p>
          )}
          <p className="text-xs font-bold text-white/80 mt-2">
            💰 Subsidy
          </p>
        </div>
      )}
    </div>
  );
}
