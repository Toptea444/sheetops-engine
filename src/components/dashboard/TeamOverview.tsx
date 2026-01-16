import { useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, Users, Calendar, Loader2, Eye, EyeOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from '@/lib/utils';

export interface WorkerSummary {
  workerId: string;
  userName: string;
  stage: string;
  totalEarnings: number;
  dailyData: Array<{ date: string; value: number; fullDate?: number }>;
  daysWorked: number;
  averageDaily: number;
  dateRange: { start: string; end: string };
}

interface StageGroup {
  stage: string;
  workers: WorkerSummary[];
  totalEarnings: number;
  averageEarnings: number;
  topEarners: WorkerSummary[];
  lowEarners: WorkerSummary[];
}

interface TeamOverviewProps {
  workers: WorkerSummary[];
  sheetName: string;
  dateRange: { start: string; end: string } | null;
  isLoading?: boolean;
  loadingPhase?: string;
}

// Expandable worker row component
function ExpandableWorkerRow({ 
  worker, 
  rank, 
  variant = 'default' 
}: { 
  worker: WorkerSummary; 
  rank: number;
  variant?: 'top' | 'low' | 'default';
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const bgClass = variant === 'top' 
    ? 'bg-green-50 dark:bg-green-950/20 hover:bg-green-100 dark:hover:bg-green-950/30' 
    : variant === 'low'
    ? 'bg-amber-50 dark:bg-amber-950/20 hover:bg-amber-100 dark:hover:bg-amber-950/30'
    : 'hover:bg-muted/50';
  
  const rankColorClass = variant === 'top' 
    ? 'text-green-600' 
    : variant === 'low' 
    ? 'text-amber-600' 
    : 'text-muted-foreground';

  const amountColorClass = variant === 'top'
    ? 'text-green-700 dark:text-green-300'
    : variant === 'low'
    ? 'text-amber-700 dark:text-amber-300'
    : 'text-foreground';

  // Sort daily data by date
  const sortedDailyData = useMemo(() => {
    return [...worker.dailyData].sort((a, b) => (a.fullDate ?? 0) - (b.fullDate ?? 0));
  }, [worker.dailyData]);

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <CollapsibleTrigger asChild>
        <div className={cn(
          "flex items-center justify-between rounded-md px-3 py-2 cursor-pointer transition-colors",
          bgClass
        )}>
          <div className="flex items-center gap-2">
            <span className={cn("text-xs font-bold w-6", rankColorClass)}>#{rank}</span>
            <span className="font-mono text-sm">{worker.workerId}</span>
            {isExpanded ? (
              <EyeOff className="h-3 w-3 text-muted-foreground" />
            ) : (
              <Eye className="h-3 w-3 text-muted-foreground" />
            )}
          </div>
          <div className="text-right">
            <div className={cn("font-medium", amountColorClass)}>
              ₦{worker.totalEarnings.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-muted-foreground">
              {worker.daysWorked} days
            </div>
          </div>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-1 ml-8 mr-2 mb-2 p-3 rounded-md bg-muted/30 border border-border/50">
          <div className="text-xs font-medium text-muted-foreground mb-2">
            Daily Breakdown ({sortedDailyData.length} entries)
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5 max-h-40 overflow-y-auto">
            {sortedDailyData.map((day, idx) => (
              <div 
                key={idx} 
                className={cn(
                  "flex justify-between items-center text-xs px-2 py-1 rounded",
                  day.value > 0 ? "bg-background" : "bg-red-50 dark:bg-red-950/20"
                )}
              >
                <span className="text-muted-foreground truncate mr-2">{day.date}</span>
                <span className={cn(
                  "font-mono font-medium",
                  day.value > 0 ? "text-foreground" : "text-red-500"
                )}>
                  ₦{day.value.toLocaleString('en-NG')}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-2 pt-2 border-t border-border/50 flex justify-between text-xs">
            <span className="text-muted-foreground">Average per day:</span>
            <span className="font-medium">
              ₦{worker.averageDaily.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function TeamOverview({ workers, sheetName, dateRange, isLoading, loadingPhase }: TeamOverviewProps) {
  const [expandedStages, setExpandedStages] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'compact' | 'detailed'>('compact');

  // Group workers by stage and calculate stats
  const stageGroups = useMemo(() => {
    const groups: Record<string, WorkerSummary[]> = {};
    
    for (const worker of workers) {
      const stage = worker.stage || 'Unknown';
      if (!groups[stage]) {
        groups[stage] = [];
      }
      groups[stage].push(worker);
    }

    // Convert to array and calculate stats
    const stageList: StageGroup[] = Object.entries(groups).map(([stage, stageWorkers]) => {
      const sortedByEarnings = [...stageWorkers].sort((a, b) => b.totalEarnings - a.totalEarnings);
      const totalEarnings = stageWorkers.reduce((sum, w) => sum + w.totalEarnings, 0);
      
      return {
        stage,
        workers: stageWorkers,
        totalEarnings,
        averageEarnings: stageWorkers.length > 0 ? totalEarnings / stageWorkers.length : 0,
        topEarners: sortedByEarnings.slice(0, 5),
        lowEarners: sortedByEarnings.slice(-5).reverse(),
      };
    });

    // Sort stages naturally (S1, S2, S3... T-1, T-2...)
    return stageList.sort((a, b) => {
      const aNum = parseInt(a.stage.replace(/\D/g, '')) || 0;
      const bNum = parseInt(b.stage.replace(/\D/g, '')) || 0;
      const aPrefix = a.stage.charAt(0);
      const bPrefix = b.stage.charAt(0);
      if (aPrefix !== bPrefix) return aPrefix.localeCompare(bPrefix);
      return aNum - bNum;
    });
  }, [workers]);

  // Overall stats
  const overallStats = useMemo(() => {
    const totalWorkers = workers.length;
    const totalEarnings = workers.reduce((sum, w) => sum + w.totalEarnings, 0);
    const sortedAll = [...workers].sort((a, b) => b.totalEarnings - a.totalEarnings);
    
    return {
      totalWorkers,
      totalEarnings,
      averageEarnings: totalWorkers > 0 ? totalEarnings / totalWorkers : 0,
      topPerformer: sortedAll[0],
      lowestPerformer: sortedAll[sortedAll.length - 1],
    };
  }, [workers]);

  const formatCurrency = (value: number) => {
    return '₦' + value.toLocaleString('en-NG', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  };

  if (isLoading) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <div className="relative">
            <Loader2 className="h-10 w-10 animate-spin mb-4" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-6 w-6 rounded-full bg-primary/20 animate-ping" />
            </div>
          </div>
          <p className="font-medium">{loadingPhase || 'Loading team data...'}</p>
          <p className="text-xs text-muted-foreground mt-1">This may take a moment for large teams</p>
        </CardContent>
      </Card>
    );
  }

  if (workers.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Users className="h-10 w-10 mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2">No Team Data Available</h3>
          <p className="text-sm text-center max-w-sm">
            Select a sheet to view all collectors and their earnings organized by stage.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with stats */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Team Overview</CardTitle>
              <Badge variant="secondary" className="ml-2">
                {sheetName}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'compact' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('compact')}
              >
                Compact
              </Button>
              <Button
                variant={viewMode === 'detailed' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('detailed')}
              >
                Detailed
              </Button>
            </div>
          </div>
          {dateRange && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-2">
              <Calendar className="h-3.5 w-3.5" />
              <span>{dateRange.start} — {dateRange.end}</span>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {/* Summary Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-foreground">{overallStats.totalWorkers}</div>
              <div className="text-xs text-muted-foreground">Total Collectors</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-foreground">{stageGroups.length}</div>
              <div className="text-xs text-muted-foreground">Stages</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-green-600">{formatCurrency(overallStats.totalEarnings)}</div>
              <div className="text-xs text-muted-foreground">Total Earnings</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-foreground">{formatCurrency(overallStats.averageEarnings)}</div>
              <div className="text-xs text-muted-foreground">Avg per Collector</div>
            </div>
          </div>

          {/* Top & Bottom Performers Quick View */}
          {overallStats.topPerformer && overallStats.lowestPerformer && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
              <div className="flex items-center gap-3 bg-green-50 dark:bg-green-950/30 rounded-lg p-3 border border-green-200 dark:border-green-800">
                <div className="bg-green-100 dark:bg-green-900 rounded-full p-2">
                  <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-green-600 dark:text-green-400 font-medium">Top Performer</div>
                  <div className="font-mono text-sm font-bold truncate">{overallStats.topPerformer.workerId}</div>
                  <div className="text-sm text-green-700 dark:text-green-300">{formatCurrency(overallStats.topPerformer.totalEarnings)}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3 border border-amber-200 dark:border-amber-800">
                <div className="bg-amber-100 dark:bg-amber-900 rounded-full p-2">
                  <TrendingDown className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-amber-600 dark:text-amber-400 font-medium">Needs Attention</div>
                  <div className="font-mono text-sm font-bold truncate">{overallStats.lowestPerformer.workerId}</div>
                  <div className="text-sm text-amber-700 dark:text-amber-300">{formatCurrency(overallStats.lowestPerformer.totalEarnings)}</div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stages Accordion */}
      <Accordion type="multiple" value={expandedStages} onValueChange={setExpandedStages} className="space-y-2">
        {stageGroups.map((group) => (
          <AccordionItem 
            key={group.stage} 
            value={group.stage}
            className="border rounded-lg bg-card overflow-hidden"
          >
            <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50">
              <div className="flex items-center justify-between w-full mr-2">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="font-mono font-bold">
                    {group.stage}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {group.workers.length} collector{group.workers.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="hidden sm:inline text-muted-foreground">
                    Avg: <span className="font-medium text-foreground">{formatCurrency(group.averageEarnings)}</span>
                  </span>
                  <span className="font-medium text-green-600 dark:text-green-400">
                    {formatCurrency(group.totalEarnings)}
                  </span>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              {viewMode === 'compact' ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Top 5 Earners */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-medium">Top 5 Earners</span>
                    </div>
                    <div className="space-y-1.5">
                      {group.topEarners.map((worker, idx) => (
                        <ExpandableWorkerRow 
                          key={worker.workerId}
                          worker={worker}
                          rank={idx + 1}
                          variant="top"
                        />
                      ))}
                    </div>
                  </div>

                  {/* Bottom 5 Earners */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingDown className="h-4 w-4 text-amber-500" />
                      <span className="text-sm font-medium">Low 5 Earners</span>
                    </div>
                    <div className="space-y-1.5">
                      {group.lowEarners.map((worker, idx) => (
                        <ExpandableWorkerRow 
                          key={worker.workerId}
                          worker={worker}
                          rank={group.workers.length - group.lowEarners.length + idx + 1}
                          variant="low"
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* Detailed View - Full Table with expandable rows */
                <ScrollArea className="h-[400px]">
                  <div className="space-y-1">
                    {[...group.workers]
                      .sort((a, b) => b.totalEarnings - a.totalEarnings)
                      .map((worker, idx) => (
                        <ExpandableWorkerRow
                          key={worker.workerId}
                          worker={worker}
                          rank={idx + 1}
                          variant="default"
                        />
                      ))}
                  </div>
                </ScrollArea>
              )}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
