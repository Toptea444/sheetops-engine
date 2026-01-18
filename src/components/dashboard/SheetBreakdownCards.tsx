import { FileSpreadsheet, TrendingUp, Award, Calendar } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { BonusResult } from '@/types/bonus';

interface SheetBreakdownCardsProps {
  results: BonusResult[];
  sheetNames: string[];
  isLoading?: boolean;
}

function getSheetIcon(sheetName: string) {
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

function getSheetColor(sheetName: string) {
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
  isLoading,
}: SheetBreakdownCardsProps) {
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

  // Group results by sheet name - match by checking sheetName in results if available
  // For now, since results don't have sheetName, we'll show aggregate per sheet type
  const sheetBreakdown = sheetNames.map((name, index) => {
    const result = results[index];
    const total = result?.totalBonus ?? 0;
    const daysCount = result?.dailyBreakdown?.length ?? 0;
    
    return {
      name,
      total,
      daysCount,
    };
  });

  if (sheetBreakdown.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {sheetBreakdown.map((sheet) => {
        const Icon = getSheetIcon(sheet.name);
        const colorClass = getSheetColor(sheet.name);
        
        return (
          <Card key={sheet.name} className="border hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center border ${colorClass}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-muted-foreground truncate">{sheet.name}</p>
                  <p className="text-xl font-semibold">
                    ₦{sheet.total.toLocaleString()}
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
