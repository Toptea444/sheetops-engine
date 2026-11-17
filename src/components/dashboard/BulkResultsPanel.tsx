import { Users, Calendar, AlertTriangle, ChevronDown, ChevronUp, FileSpreadsheet } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
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
      <Card className="h-full border-border/70 shadow-none">
        <CardContent className="flex min-h-[260px] flex-col items-center justify-center p-8 text-center">
          <Users className="mb-4 h-6 w-6 text-muted-foreground/60" />
          <h3 className="text-sm font-medium">No results yet</h3>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">Enter IDs and choose a date range to compare earnings.</p>
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

      <Card className="overflow-hidden border-border/70 shadow-none">
        <div className="border-b border-border/70 px-5 py-6 sm:px-6">
          <p className="text-sm text-muted-foreground">Combined total</p>
          <p className="mt-2 break-words text-3xl font-semibold tracking-tight tabular-nums sm:text-4xl">{formatValue(grandTotal, valueType)}</p>
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" />{results.length} worker{results.length !== 1 ? 's' : ''}</span>
            <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />{results[0]?.dateRange.start} — {results[0]?.dateRange.end}</span>
            {sheetName && <span className="flex min-w-0 items-center gap-1.5"><FileSpreadsheet className="h-3.5 w-3.5 shrink-0" /><span className="break-words">{sheetName}</span></span>}
            <span>{totalDaysWithBonus} earning days</span>
          </div>
        </div>

        {/* Comparison Table */}
        <CardContent className="p-0">
          <div className="border-b px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Worker results</div>
          <div className="divide-y">
            {results.map((result, index) => (
              <Collapsible 
                key={result.workerId} 
                open={expandedWorkers.has(result.workerId)}
                onOpenChange={() => toggleExpanded(result.workerId)}
              >
                <CollapsibleTrigger className="w-full">
                  <div className={cn(
                    "flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-muted/50 transition-colors cursor-pointer",
                    index === 0 && "rounded-t-none"
                  )}>
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="w-5 shrink-0 text-xs tabular-nums text-muted-foreground">{index + 1}</span>
                      <div className="min-w-0 text-left">
                        <p className="break-all font-medium">{result.workerId}</p>
                        <p className="break-words text-sm text-muted-foreground">{result.userName}</p>
                      </div>
                      {result.stage !== 'N/A' && <span className="hidden text-xs text-muted-foreground sm:inline">{result.stage}</span>}
                      {result.dateWarning && (
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className={cn(
                          "font-semibold tabular-nums text-lg",
                          result.totalBonus > 0 ? "text-foreground" : "text-muted-foreground"
                        )}>
                          {formatValue(result.totalBonus, valueType)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {result.dailyBreakdown.filter(d => d.value > 0).length} earning days
                        </p>
                        <p className="mt-1 text-xs font-medium text-primary">
                          {expandedWorkers.has(result.workerId) ? 'Hide breakdown' : 'View breakdown'}
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
                            day.value > 0 ? "font-medium" : "text-muted-foreground"
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