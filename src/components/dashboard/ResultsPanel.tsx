import { TrendingUp, User, Calendar, Award, Coins, ChevronRight, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { BonusResult } from '@/types/bonus';
import { cn } from '@/lib/utils';

interface ResultsPanelProps {
  result: BonusResult | null;
  sheetName: string;
}

const CURRENCY_SYMBOL = '₦'; // Nigerian Naira

function formatValue(value: number, valueType?: 'percent' | 'amount') {
  if (valueType === 'amount') {
    return `${CURRENCY_SYMBOL}${formatNumber(value)}`;
  }
  return `${value.toFixed(2)}%`;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-NG', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function ResultsPanel({ result, sheetName }: ResultsPanelProps) {
  if (!result) {
    return (
      <Card className="border-dashed border-2 border-muted-foreground/20 h-full">
        <CardContent className="flex min-h-[300px] lg:min-h-[400px] flex-col items-center justify-center text-muted-foreground p-8">
          <div className="rounded-full bg-muted p-6 mb-6">
            <TrendingUp className="h-12 w-12 opacity-40" />
          </div>
          <h3 className="text-xl font-semibold mb-2 text-foreground">No Results Yet</h3>
          <p className="text-center max-w-sm">
            Enter your Worker ID and select a date range to calculate your bonus
          </p>
        </CardContent>
      </Card>
    );
  }

  const valueType = result.valueType;
  const daysWithBonus = result.dailyBreakdown.filter(d => d.value > 0).length;
  const totalDays = result.dailyBreakdown.length;

  return (
    <div className="space-y-6">
      {/* Date Warning Alert */}
      {result.dateWarning && (
        <Alert variant="default" className="border-amber-500/50 bg-amber-500/10">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800 dark:text-amber-200">
            {result.dateWarning}
            {result.actualDateRange && (
              <span className="block mt-1 text-sm">
                Showing data from <strong>{result.actualDateRange.start}</strong> to <strong>{result.actualDateRange.end}</strong>
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Header Card with Total Bonus */}
      <Card className="overflow-hidden">
        <div className="corporate-gradient p-6 text-primary-foreground">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm text-white/70 mb-1">Total Bonus Earned</p>
              <p className="text-4xl font-bold tracking-tight">
                {formatValue(result.totalBonus, valueType)}
              </p>
            </div>
            <div className="rounded-xl bg-white/10 p-3">
              <Coins className="h-8 w-8" />
            </div>
          </div>
          
          <div className="flex items-center gap-4 text-sm text-white/80">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              <span>{result.dateRange.start} — {result.dateRange.end}</span>
            </div>
            <Badge variant="secondary" className="bg-white/20 text-white border-0 hover:bg-white/30">
              {daysWithBonus} of {totalDays} days earned
            </Badge>
          </div>
        </div>
        
        {/* Worker Details */}
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Worker ID</p>
              <p className="font-mono text-lg font-semibold text-foreground">{result.workerId}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Name</p>
              <p className="text-lg font-semibold text-foreground truncate">{result.userName}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Stage</p>
              <Badge variant="outline" className="text-base font-semibold px-3">
                {result.stage}
              </Badge>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sheet</p>
              <p className="text-sm font-medium text-muted-foreground truncate">{sheetName}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Daily Breakdown */}
      {result.dailyBreakdown.length > 0 && (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                <span>Daily Breakdown</span>
              </div>
              <Badge variant="secondary" className="font-normal">
                {totalDays} days
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-1">
              {result.dailyBreakdown.map((day, index) => (
                <div key={index}>
                  <div 
                    className={cn(
                      "flex items-center justify-between py-3 px-4 rounded-lg transition-colors",
                      day.value > 0 
                        ? "bg-success/5 hover:bg-success/10" 
                        : "bg-muted/30 hover:bg-muted/50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        day.value > 0 ? "bg-success" : "bg-muted-foreground/30"
                      )} />
                      <span className={cn(
                        "font-medium",
                        day.value === 0 && "text-muted-foreground"
                      )}>
                        {day.date}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "font-mono font-semibold text-lg",
                        day.value > 0 ? "text-success" : "text-muted-foreground"
                      )}>
                        {day.value > 0 ? formatValue(day.value, valueType) : '—'}
                      </span>
                      {day.value > 0 && (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                  {index < result.dailyBreakdown.length - 1 && (
                    <Separator className="my-0.5 opacity-50" />
                  )}
                </div>
              ))}
            </div>
            
            {/* Summary Footer */}
            <div className="mt-6 pt-4 border-t">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total for {totalDays} days</p>
                  <p className="text-xs text-muted-foreground">
                    ({daysWithBonus} days with earnings)
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary">
                    {formatValue(result.totalBonus, valueType)}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
