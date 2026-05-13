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

  const gradients = [
    'card-gradient-blue',
    'card-gradient-mint', 
    'card-gradient-lavender',
    'card-gradient-yellow',
  ];

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 py-2">
      {sheetBreakdown.map((sheet, idx) => (
        <div 
          key={sheet.name} 
          className={`shrink-0 px-4 py-3 rounded-2xl min-w-[140px] text-white font-bold cute-shadow ${gradients[idx % gradients.length]} relative overflow-hidden`}
        >
          {/* Decorative emoji */}
          <div className="absolute top-2 right-3 text-lg opacity-40">
            {idx % 4 === 0 ? '💙' : idx % 4 === 1 ? '💚' : idx % 4 === 2 ? '💜' : '💛'}
          </div>
          
          <div className="flex items-start gap-2 mb-2 relative z-10">
            <p className="text-xs text-white/90 font-bold truncate max-w-[100px] uppercase tracking-wide">
              {sheet.name.split(' ')[0]}
            </p>
            {sheet.isPercent && (
              <Badge className="text-[10px] px-1.5 py-0.5 h-5 bg-white/30 text-white border-0 font-bold">%</Badge>
            )}
          </div>
          {displayMode === 'dots' ? (
            <div className="h-6 w-16 rounded-lg bg-white/20 animate-pulse" />
          ) : (
            <p className="text-lg font-black text-white drop-shadow">
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
        <div className="shrink-0 px-4 py-3 rounded-2xl min-w-[140px] text-white font-bold cute-shadow card-gradient-pink relative overflow-hidden">
          <div className="absolute top-2 right-3 text-lg opacity-40">🚗</div>
          
          <div className="flex items-start gap-2 mb-2 relative z-10">
            <p className="text-xs text-white/90 font-bold truncate max-w-[100px] uppercase tracking-wide">
              Transport
            </p>
          </div>
          {displayMode === 'dots' ? (
            <div className="h-6 w-16 rounded-lg bg-white/20 animate-pulse" />
          ) : (
            <p className="text-lg font-black text-white drop-shadow">
              {subsidyData ? `₦${subsidyData.actualSubsidy.toLocaleString()}` : '—'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
