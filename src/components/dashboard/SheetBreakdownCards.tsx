import { useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import type { BonusResult } from '@/types/bonus';
import type { CyclePeriod } from '@/lib/cycleUtils';
import { isDateInCycle } from '@/lib/cycleUtils';

interface SheetBreakdownCardsProps {
  results: BonusResult[];
  sheetNames: string[];
  cycle: CyclePeriod;
  isLoading?: boolean;
}

export function SheetBreakdownCards({
  results,
  sheetNames,
  cycle,
  isLoading,
}: SheetBreakdownCardsProps) {
  const sheetBreakdown = useMemo(() => {
    return sheetNames.map((name) => {
      const result = results.find(r => r.sheetName === name);
      const isPercent = result?.valueType === 'percent';
      
      let total = 0;
      let daysCount = 0;
      
      result?.dailyBreakdown?.forEach((day) => {
        if (day.fullDate === undefined) return;
        const dayDate = new Date(day.fullDate);
        if (isDateInCycle(dayDate, cycle)) {
          total += day.value;
          if (day.value > 0) daysCount++;
        }
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

  if (sheetBreakdown.length === 0) return null;

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
      {sheetBreakdown.map((sheet) => (
        <div 
          key={sheet.name} 
          className="shrink-0 px-3 py-2.5 rounded-lg border bg-card/70 min-w-[132px]"
        >
          <div className="flex items-center gap-2 mb-1">
            <p className="text-xs text-muted-foreground truncate max-w-[110px]">
              {sheet.name.split(' ')[0]}
            </p>
            {sheet.isPercent && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">%</Badge>
            )}
          </div>
          <p className="text-base font-semibold">
            {sheet.isPercent 
              ? `${sheet.total.toFixed(1)}%`
              : `₦${sheet.total.toLocaleString()}`
            }
          </p>
        </div>
      ))}
    </div>
  );
}
