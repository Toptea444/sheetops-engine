import { useMemo } from 'react';
import { FileSpreadsheet, TrendingUp, Award, Calendar, Percent } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
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

function getSheetIcon(sheetName: string, isPercent: boolean) {
  if (isPercent) return Percent;
  const name = sheetName.toUpperCase();
  if (name.includes('DAILY') || name.includes('PERFORMANCE')) {
    return TrendingUp;
  }
  if (name.includes('RANKING')) {
    return Award;
  }
  if (name.includes('WEEKLY')) {
    return Calendar;
  }
  return FileSpreadsheet;
}

function getSheetColor(sheetName: string, isPercent: boolean) {
  if (isPercent) {
    return 'bg-muted text-muted-foreground border-border';
  }
  const name = sheetName.toUpperCase();
  if (name.includes('DAILY') || name.includes('PERFORMANCE')) {
    return 'bg-chart-1/10 text-chart-1 border-chart-1/20';
  }
  if (name.includes('RANKING')) {
    return 'bg-chart-3/10 text-chart-3 border-chart-3/20';
  }
  if (name.includes('WEEKLY')) {
    return 'bg-chart-4/10 text-chart-4 border-chart-4/20';
  }
  return 'bg-chart-5/10 text-chart-5 border-chart-5/20';
}

export function SheetBreakdownCards({
  results,
  sheetNames,
  cycle,
  isLoading,
}: SheetBreakdownCardsProps) {
  // Calculate cycle-filtered totals per sheet
  const sheetBreakdown = useMemo(() => {
    return sheetNames.map((name, index) => {
      const result = results[index];
      const isPercent = result?.valueType === 'percent';
      
      // Filter by cycle and sum up values
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

      return {
        name,
        total,
        daysCount,
        isPercent,
      };
    });
  }, [sheetNames, results, cycle]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-6 w-20" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (sheetBreakdown.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {sheetBreakdown.map((sheet) => {
        const Icon = getSheetIcon(sheet.name, sheet.isPercent);
        const colorClass = getSheetColor(sheet.name, sheet.isPercent);
        
        return (
          <Card key={sheet.name} className="border hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center border ${colorClass}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-muted-foreground truncate">{sheet.name}</p>
                    {sheet.isPercent && (
                      <Badge variant="secondary" className="text-xs px-1.5 py-0">%</Badge>
                    )}
                  </div>
                  <p className="text-xl font-semibold">
                    {sheet.isPercent 
                      ? `${sheet.total.toFixed(1)}%`
                      : `₦${sheet.total.toLocaleString()}`
                    }
                  </p>
                  {sheet.daysCount > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {sheet.daysCount} {sheet.daysCount === 1 ? 'entry' : 'entries'}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
