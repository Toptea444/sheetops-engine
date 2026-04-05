import { useState, useMemo, useEffect } from 'react';
import { ChevronDown, ChevronUp, Bus, User, CalendarDays, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { BonusResult } from '@/types/bonus';
import type { CyclePeriod } from '@/lib/cycleUtils';
import { isDateInCycle } from '@/lib/cycleUtils';
import type { TransportSubsidyData } from '@/hooks/useTransportSubsidy';

interface DailyEarningsTableProps {
  results: BonusResult[];
  sheetNames: string[];
  cycle: CyclePeriod;
  isLoading?: boolean;
  getTransferInfo?: (workerId: string, dateStr: string, sheetName?: string) => { type: 'credit' | 'debit'; amount: number } | null;
  currentUserId?: string | null;
  subsidyData?: TransportSubsidyData | null;
  subsidyOptedIn?: boolean;
  subsidyKId?: string | null;
}

interface DayData {
  date: string;
  fullDate: number;
  value: number;
  bonus?: number;
  rankingBonus?: number;
  total?: number;
  sourceWorkerId?: string;
}

export function DailyEarningsTable({
  results,
  sheetNames,
  cycle,
  isLoading,
  getTransferInfo,
  currentUserId,
}: DailyEarningsTableProps) {
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showAll, setShowAll] = useState(false);
  const [activeTab, setActiveTab] = useState(sheetNames[0] || '');

  useEffect(() => {
    if (!sheetNames.includes(activeTab) && sheetNames.length > 0) {
      setActiveTab(sheetNames[0]);
    }
  }, [sheetNames, activeTab]);

  const sheetData = useMemo(() => {
    // Merge ALL results for this sheet (handles swap scenario where there are
    // two results for the same sheet: one for current ID, one for old ID)
    const matchingResults = results.filter(r => r.sheetName === activeTab);
    if (matchingResults.length === 0) return [];
    const days: DayData[] = [];

    matchingResults.forEach(result => {
      result.dailyBreakdown?.forEach((day) => {
        if (day.fullDate === undefined) return;
        const dayDate = new Date(day.fullDate);
        if (!isDateInCycle(dayDate, cycle)) return;

        const total = day.total ?? day.value;

        days.push({
          date: day.date,
          fullDate: day.fullDate,
          value: total,
          total,
          bonus: day.bonus,
          rankingBonus: day.rankingBonus,
          sourceWorkerId: day.sourceWorkerId,
        });
      });
    });

    days.sort((a, b) =>
      sortOrder === 'desc' ? b.fullDate - a.fullDate : a.fullDate - b.fullDate
    );

    return days;
  }, [results, sheetNames, activeTab, cycle, sortOrder]);

  const isPercent = useMemo(() => {
    const result = results.find(r => r.sheetName === activeTab);
    return result?.valueType === 'percent';
  }, [results, activeTab]);  // fine to use first match — valueType is consistent across IDs for same sheet

  const stats = useMemo(() => {
    const total = sheetData.reduce((sum, day) => sum + (day.total ?? day.value), 0);
    const bonusTotal = sheetData.reduce((sum, day) => sum + (day.bonus ?? 0), 0);
    const rankingBonusTotal = sheetData.reduce((sum, day) => sum + (day.rankingBonus ?? 0), 0);
    const hasSplit = sheetData.some(
      (d) => d.bonus !== undefined || d.rankingBonus !== undefined
    );
    const avg = sheetData.length > 0 ? total / sheetData.length : 0;
    return { total, avg, count: sheetData.length, bonusTotal, rankingBonusTotal, hasSplit };
  }, [sheetData]);

  const formatCurrency = (value: number) => `₦${value.toLocaleString()}`;

  const formatValue = (value: number) => {
    if (isPercent) return `${value.toFixed(1)}%`;
    return formatCurrency(value);
  };

  // Get transfer indicator for a specific day (using local date to avoid UTC shift)
  const getTransferIndicator = (day: DayData) => {
    if (!getTransferInfo || !currentUserId) return null;
    const d = new Date(day.fullDate);
    const dayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return getTransferInfo(currentUserId, dayStr, activeTab);
  };

  const displayedDays = showAll ? sheetData : sheetData.slice(0, 6);

  const tabLabel = (name: string) => (name.split(' ')[0] || name).toUpperCase();

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between gap-2">
          <TabsList className="h-9 p-0.5 bg-muted/40">
            {sheetNames.map((name) => (
              <TabsTrigger 
                key={name} 
                value={name}
                title={name}
                className="text-sm h-8 px-3 text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
              >
                {tabLabel(name)}
              </TabsTrigger>
            ))}
          </TabsList>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
            className="h-8 text-sm gap-1 text-muted-foreground"
          >
            {sortOrder === 'desc' ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            {sortOrder === 'desc' ? 'Newest' : 'Oldest'}
          </Button>
        </div>

        {sheetNames.map((name) => (
          <TabsContent key={name} value={name} className="mt-3">
            {name === activeTab && (
              <>
                <p className="text-sm font-medium text-foreground truncate mb-2" title={activeTab}>
                  {activeTab}
                </p>

                {stats.hasSplit && !isPercent ? (
                  <div className="grid grid-cols-4 gap-2 mb-3 p-3 bg-muted/20 rounded-lg text-center">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Bonus</p>
                      <p className="text-base font-semibold">{formatCurrency(stats.bonusTotal)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Ranking</p>
                      <p className="text-base font-semibold">{formatCurrency(stats.rankingBonusTotal)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Total</p>
                      <p className="text-base font-semibold">{formatCurrency(stats.total)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Entries</p>
                      <p className="text-base font-semibold">{stats.count}</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2 mb-3 p-3 bg-muted/20 rounded-lg text-center">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Total</p>
                      <p className="text-base font-semibold">{formatValue(stats.total)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Average</p>
                      <p className="text-base font-semibold">{formatValue(stats.avg)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Entries</p>
                      <p className="text-base font-semibold">{stats.count}</p>
                    </div>
                  </div>
                )}

                {sheetData.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-6">
                    No entries for this cycle
                  </p>
                ) : (
                  <>
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent bg-muted/20">
                            <TableHead className="text-sm font-medium h-10">Date</TableHead>
                            {stats.hasSplit && !isPercent ? (
                              <>
                                <TableHead className="text-sm font-medium h-10 text-right">Bonus</TableHead>
                                <TableHead className="text-sm font-medium h-10 text-right">Ranking Bonus</TableHead>
                                <TableHead className="text-sm font-medium h-10 text-right">Total</TableHead>
                              </>
                            ) : (
                              <TableHead className="text-sm font-medium h-10 text-right">
                                {isPercent ? 'Bonus %' : 'Amount'}
                              </TableHead>
                            )}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {displayedDays.map((day) => {
                            const transferInfo = getTransferIndicator(day);
                            return (
                              <TableRow key={day.fullDate}>
                                <TableCell className="text-sm py-3">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span>{day.date}</span>
                                    {day.sourceWorkerId && (
                                      <Badge 
                                        variant="outline" 
                                        className="text-[10px] px-1.5 py-0.5 whitespace-nowrap text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/30"
                                      >
                                        via {day.sourceWorkerId}
                                      </Badge>
                                    )}
                                    {transferInfo && (
                                      <Badge 
                                        variant="outline" 
                                        className={`text-[10px] px-1.5 py-0.5 font-mono whitespace-nowrap ${
                                          transferInfo.type === 'credit' 
                                            ? 'text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/30' 
                                            : 'text-red-600 dark:text-red-400 border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/30'
                                        }`}
                                      >
                                        {transferInfo.type === 'credit' ? '+' : '-'}₦{transferInfo.amount.toLocaleString()}
                                      </Badge>
                                    )}
                                  </div>
                                </TableCell>
                                {stats.hasSplit && !isPercent ? (
                                  <>
                                    <TableCell className="text-sm py-2.5 text-right font-medium">
                                      {formatCurrency(day.bonus ?? 0)}
                                    </TableCell>
                                    <TableCell className="text-sm py-2.5 text-right font-medium">
                                      {formatCurrency(day.rankingBonus ?? 0)}
                                    </TableCell>
                                    <TableCell className="text-sm py-2.5 text-right font-semibold">
                                      {formatCurrency(day.total ?? day.value)}
                                    </TableCell>
                                  </>
                                ) : (
                                  <TableCell className="text-sm py-2.5 text-right font-medium">
                                    {formatValue(day.value)}
                                  </TableCell>
                                )}
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                    
                    {sheetData.length > 6 && (
                      <div className="flex justify-center pt-3">
                        <button 
                          onClick={() => setShowAll(!showAll)}
                          className="text-xs text-primary underline hover:no-underline transition-all"
                        >
                          {showAll ? 'View less' : `View more`}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
