import { TrendingUp, Users, Calendar, Award, Coins, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { BonusResult } from '@/types/bonus';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface BulkResultsPanelProps {
  results: BonusResult[];
  sheetName: string;
}

const CURRENCY_SYMBOL = '₦';

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

export function BulkResultsPanel({ results, sheetName }: BulkResultsPanelProps) {
  const [expandedWorkers, setExpandedWorkers] = useState<Set<string>>(new Set());

  if (results.length === 0) {
    return (
      <Card className="border-dashed border-2 border-muted-foreground/20 h-full">
        <CardContent className="flex min-h-[300px] lg:min-h-[400px] flex-col items-center justify-center text-muted-foreground p-8">
          <div className="rounded-full bg-muted p-6 mb-6">
            <Users className="h-12 w-12 opacity-40" />
          </div>
          <h3 className="text-xl font-semibold mb-2 text-foreground">No Results Yet</h3>
          <p className="text-center max-w-sm">
            Enter Collector IDs and select a date range to compare bonuses
          </p>
        </CardContent>
      </Card>
    );
  }

  const toggleExpanded = (workerId: string) => {
    const newExpanded = new Set(expandedWorkers);
    if (newExpanded.has(workerId)) {
      newExpanded.delete(workerId);
    } else {
      newExpanded.add(workerId);
    }
    setExpandedWorkers(newExpanded);
  };

  // Calculate totals
  const grandTotal = results.reduce((sum, r) => sum + r.totalBonus, 0);
  const totalDaysWithBonus = results.reduce((sum, r) => 
    sum + r.dailyBreakdown.filter(d => d.value > 0).length, 0
  );
  const valueType = results[0]?.valueType ?? 'amount';

  // Check if any results have date warnings
  const hasWarnings = results.some(r => r.dateWarning);

  return (
    <div className="space-y-6">
      {/* Warnings */}
      {hasWarnings && (
        <Alert variant="default" className="border-amber-500/50 bg-amber-500/10">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800 dark:text-amber-200">
            Some collectors have date range adjustments. Check individual results for details.
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Card */}
      <Card className="overflow-hidden">
        <div className="corporate-gradient p-6 text-primary-foreground">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm text-white/70 mb-1">Combined Total</p>
              <p className="text-4xl font-bold tracking-tight">
                {formatValue(grandTotal, valueType)}
              </p>
            </div>
            <div className="rounded-xl bg-white/10 p-3">
              <Coins className="h-8 w-8" />
            </div>
          </div>
          
          <div className="flex items-center gap-4 text-sm text-white/80 flex-wrap">
            <div className="flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              <span>{results.length} worker{results.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              <span>{results[0]?.dateRange.start} — {results[0]?.dateRange.end}</span>
            </div>
            <Badge variant="secondary" className="bg-white/20 text-white border-0 hover:bg-white/30">
              {totalDaysWithBonus} total earning days
            </Badge>
          </div>
        </div>

        {/* Comparison Table */}
        <CardContent className="p-0">
          <div className="divide-y">
            {results.map((result, index) => (
              <Collapsible 
                key={result.workerId} 
                open={expandedWorkers.has(result.workerId)}
                onOpenChange={() => toggleExpanded(result.workerId)}
              >
                <CollapsibleTrigger className="w-full">
                  <div className={cn(
                    "flex items-center justify-between p-4 hover:bg-muted/50 transition-colors cursor-pointer",
                    index === 0 && "rounded-t-none"
                  )}>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                        {index + 1}
                      </div>
                      <div className="text-left">
                        <p className="font-mono font-semibold">{result.workerId}</p>
                        <p className="text-sm text-muted-foreground">{result.userName}</p>
                      </div>
                      {result.stage !== 'N/A' && (
                        <Badge variant="outline" className="hidden sm:inline-flex">
                          {result.stage}
                        </Badge>
                      )}
                      {result.dateWarning && (
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className={cn(
                          "font-mono font-bold text-lg",
                          result.totalBonus > 0 ? "text-success" : "text-muted-foreground"
                        )}>
                          {formatValue(result.totalBonus, valueType)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {result.dailyBreakdown.filter(d => d.value > 0).length} days
                        </p>
                      </div>
                      {expandedWorkers.has(result.workerId) ? (
                        <ChevronUp className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <div className="px-4 pb-4 pt-0">
                    {result.dateWarning && (
                      <Alert variant="default" className="mb-3 border-amber-500/50 bg-amber-500/10">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <AlertDescription className="text-sm text-amber-800 dark:text-amber-200">
                          {result.dateWarning}
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    <div className="bg-muted/30 rounded-lg p-3 space-y-1">
                      {result.dailyBreakdown.map((day, dayIndex) => (
                        <div 
                          key={dayIndex}
                          className="flex items-center justify-between py-1.5 px-2 text-sm"
                        >
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              day.value > 0 ? "bg-success" : "bg-muted-foreground/30"
                            )} />
                            <span className={day.value === 0 ? "text-muted-foreground" : ""}>
                              {day.date}
                            </span>
                          </div>
                          <span className={cn(
                            "font-mono",
                            day.value > 0 ? "text-success font-medium" : "text-muted-foreground"
                          )}>
                            {day.value > 0 ? formatValue(day.value, valueType) : '—'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}