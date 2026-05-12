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
  recoveryRate?: number;
  recoveryRateRaw?: string;
  sourceWorkerId?: string;
  stage?: string;
}

function formatRecoveryRate(value?: number, raw?: string): string {
  // Prefer the exact raw string from the sheet (no normalization)
  if (raw && raw.length > 0) return raw;
  if (value === undefined || value === null || !Number.isFinite(value)) return '—';
  // Fallback: render the raw numeric value with a % suffix, no scaling
  return `${value}%`;
}

// Stage-aware target thresholds for Third Party recovery bonus standards.
// Higher Target Met % = better tier/color for the worker's stage.
const STAGE_TARGET_THRESHOLDS: Record<string, { top: number; mid: number; base: number }> = {
  'T-1': { top: 52, mid: 46, base: 40 },
  T0: { top: 24, mid: 20, base: 16 },
  S1: { top: 6.5, mid: 4.5, base: 2.5 },
  S2: { top: 1.3, mid: 0.9, base: 0.5 },
  S3: { top: 0.4, mid: 0.3, base: 0.2 },
  S4: { top: 0.08, mid: 0.05, base: 0.02 },
};

function normalizeStage(stage?: string): string {
  if (!stage) return '';
  return stage.trim().toUpperCase().replace(/\s+/g, '');
}

function recoveryTone(value?: number, stage?: string): string {
  if (value === undefined || value === null || !Number.isFinite(value)) return 'text-muted-foreground';

  const thresholds = STAGE_TARGET_THRESHOLDS[normalizeStage(stage)];
  if (!thresholds) return 'text-muted-foreground';

  if (value >= thresholds.top) return 'text-emerald-600 dark:text-emerald-400';
  if (value >= thresholds.mid) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

export function DailyEarningsTable({
  results,
  sheetNames,
  cycle,
  isLoading,
  getTransferInfo,
  currentUserId,
  subsidyData,
  subsidyOptedIn,
  subsidyKId,
}: DailyEarningsTableProps) {
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showAll, setShowAll] = useState(false);
  const [activeTab, setActiveTab] = useState(sheetNames[0] || '');

  useEffect(() => {
    const availableTabs = subsidyOptedIn
      ? [...sheetNames, '__transport_subsidy__']
      : sheetNames;

    if (!availableTabs.includes(activeTab) && sheetNames.length > 0) {
      setActiveTab(sheetNames[0]);
    }
  }, [sheetNames, activeTab, subsidyOptedIn]);

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
          recoveryRate: day.recoveryRate,
          recoveryRateRaw: day.recoveryRateRaw,
          sourceWorkerId: day.sourceWorkerId,
          stage: result.stage,
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
    const hasRecovery = sheetData.some((d) => d.recoveryRate !== undefined && d.recoveryRate !== null);
    const avg = sheetData.length > 0 ? total / sheetData.length : 0;
    return { total, avg, count: sheetData.length, bonusTotal, rankingBonusTotal, hasSplit, hasRecovery };
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
            {subsidyOptedIn && (
              <TabsTrigger 
                value="__transport_subsidy__"
                title="Transport Subsidy"
                className="text-sm h-8 px-3 text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
              >
                TRANSPORT
              </TabsTrigger>
            )}
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
                    <div className="border rounded-lg overflow-x-auto">
                      <Table className="w-full">
                        <TableHeader>
                          <TableRow className="hover:bg-transparent bg-muted/20">
                            <TableHead className="text-sm font-medium h-10 whitespace-nowrap px-4 min-w-max">Date</TableHead>
                            {stats.hasRecovery && (
                              <TableHead className="text-sm font-medium h-10 text-right whitespace-nowrap px-4 min-w-max">Target Met</TableHead>
                            )}
                            {stats.hasSplit && !isPercent ? (
                              <>
                                <TableHead className="text-sm font-medium h-10 text-right whitespace-nowrap px-4 min-w-max">Bonus</TableHead>
                                <TableHead className="text-sm font-medium h-10 text-right whitespace-nowrap px-4 min-w-max">Ranking Bonus</TableHead>
                                <TableHead className="text-sm font-medium h-10 text-right whitespace-nowrap px-4 min-w-max">Total</TableHead>
                              </>
                            ) : (
                              <TableHead className="text-sm font-medium h-10 text-right whitespace-nowrap px-4 min-w-max">
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
                                <TableCell className="text-sm py-3 px-4 whitespace-nowrap min-w-max">
                                  <span>{day.date}</span>
                                </TableCell>
                                {stats.hasRecovery && (
                                  <TableCell className={`text-sm py-2.5 text-right font-medium tabular-nums px-4 whitespace-nowrap min-w-max ${recoveryTone(day.recoveryRate, day.stage)}`}>
                                    {formatRecoveryRate(day.recoveryRate, day.recoveryRateRaw)}
                                  </TableCell>
                                )}
                                {stats.hasSplit && !isPercent ? (
                                  <>
                                    <TableCell className="text-sm py-2.5 text-right font-medium px-4 whitespace-nowrap min-w-max">
                                      {formatCurrency(day.bonus ?? 0)}
                                    </TableCell>
                                    <TableCell className="text-sm py-2.5 text-right font-medium px-4 whitespace-nowrap min-w-max">
                                      {formatCurrency(day.rankingBonus ?? 0)}
                                    </TableCell>
                                    <TableCell className="text-sm py-2.5 text-right font-semibold px-4 whitespace-nowrap min-w-max">
                                      {formatCurrency(day.total ?? day.value)}
                                    </TableCell>
                                  </>
                                ) : (
                                  <TableCell className="text-sm py-2.5 text-right font-medium px-4 whitespace-nowrap min-w-max">
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

        {/* Transport Subsidy tab content */}
        {subsidyOptedIn && (
          <TabsContent value="__transport_subsidy__" className="mt-3">
            <p className="text-sm font-medium text-foreground mb-3">Transport Subsidy</p>
            {subsidyData ? (
              <div className="space-y-4">
                {/* Summary stats */}
                <div className="grid grid-cols-2 gap-3 p-4 bg-muted/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Name</p>
                      <p className="text-sm font-semibold truncate">{subsidyData.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Bus className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">K ID</p>
                      <p className="text-sm font-semibold font-mono">{subsidyKId?.toUpperCase()}</p>
                    </div>
                  </div>
                </div>

                {/* Detailed breakdown */}
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent bg-muted/20">
                        <TableHead className="text-sm font-medium h-10">Metric</TableHead>
                        <TableHead className="text-sm font-medium h-10 text-right">Value</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="text-sm py-3">
                          <div className="flex items-center gap-2">
                            <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                            Working Days
                          </div>
                        </TableCell>
                        <TableCell className="text-sm py-3 text-right font-semibold">{subsidyData.workingDays}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-sm py-3">
                          <div className="flex items-center gap-2">
                            <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                            Days Present
                          </div>
                        </TableCell>
                        <TableCell className="text-sm py-3 text-right font-semibold">{subsidyData.daysPresent}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-sm py-3">
                          <div className="flex items-center gap-2">
                            <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
                            Attendance Rate
                          </div>
                        </TableCell>
                        <TableCell className="text-sm py-3 text-right font-semibold">{subsidyData.attendanceRate}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-sm py-3">
                          <div className="flex items-center gap-2">
                            <Bus className="h-3.5 w-3.5 text-muted-foreground" />
                            Subsidy Standard
                          </div>
                        </TableCell>
                        <TableCell className="text-sm py-3 text-right font-semibold">₦{subsidyData.subsidyStandard.toLocaleString()}</TableCell>
                      </TableRow>
                      <TableRow className="bg-primary/5">
                        <TableCell className="text-sm py-3 font-semibold">
                          Actual Subsidy
                        </TableCell>
                        <TableCell className="text-sm py-3 text-right font-bold text-primary">₦{subsidyData.actualSubsidy.toLocaleString()}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : (
              <p className="text-center text-sm text-muted-foreground py-6">
                No transport subsidy data available
              </p>
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
