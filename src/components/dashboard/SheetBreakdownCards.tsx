import { useMemo } from 'react';
import { FileSpreadsheet, TrendingUp, Award, Calendar, Percent, Layers } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    return {
      bg: 'bg-muted',
      icon: 'bg-muted-foreground/10 text-muted-foreground',
    };
  }
  const name = sheetName.toUpperCase();
  if (name.includes('DAILY') || name.includes('PERFORMANCE')) {
    return {
      bg: 'bg-chart-1/5',
      icon: 'bg-chart-1/10 text-chart-1',
    };
  }
  if (name.includes('RANKING')) {
    return {
      bg: 'bg-chart-3/5',
      icon: 'bg-chart-3/10 text-chart-3',
    };
  }
  if (name.includes('WEEKLY')) {
    return {
      bg: 'bg-chart-4/5',
      icon: 'bg-chart-4/10 text-chart-4',
    };
  }
  return {
    bg: 'bg-chart-5/5',
    icon: 'bg-chart-5/10 text-chart-5',
  };
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
      <Card className="border-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Layers className="h-4 w-4 text-primary" />
            </div>
            Bonus Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (sheetBreakdown.length === 0) {
    return null;
  }

  return (
    <Card className="border-2">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Layers className="h-4 w-4 text-primary" />
          </div>
          Bonus Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {sheetBreakdown.map((sheet) => {
            const Icon = getSheetIcon(sheet.name, sheet.isPercent);
            const colors = getSheetColor(sheet.name, sheet.isPercent);
            
            return (
              <div 
                key={sheet.name} 
                className={`p-4 rounded-lg border border-border/50 transition-colors hover:border-border ${colors.bg}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${colors.icon}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm text-muted-foreground truncate">{sheet.name}</p>
                      {sheet.isPercent && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">%</Badge>
                      )}
                    </div>
                    <p className="text-xl font-bold text-foreground">
                      {sheet.isPercent 
                        ? `${sheet.total.toFixed(1)}%`
                        : `₦${sheet.total.toLocaleString()}`
                      }
                    </p>
                    {sheet.daysCount > 0 && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {sheet.daysCount} {sheet.daysCount === 1 ? 'entry' : 'entries'}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
