import { useState, useMemo, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
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

interface DailyEarningsTableProps {
  results: BonusResult[];
  sheetNames: string[];
  cycle: CyclePeriod;
  isLoading?: boolean;
}

interface DayData {
  date: string;
  fullDate: number;
  /** Per-day total (backwards compatible with old 'value') */
  value: number;
  bonus?: number;
  rankingBonus?: number;
  total?: number;
}

export function DailyEarningsTable({
  results,
  sheetNames,
  cycle,
  isLoading,
}: DailyEarningsTableProps) {
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showAll, setShowAll] = useState(false);
  const [activeTab, setActiveTab] = useState(sheetNames[0] || '');

  // Update active tab when sheet names change
  useEffect(() => {
    if (!sheetNames.includes(activeTab) && sheetNames.length > 0) {
      setActiveTab(sheetNames[0]);
    }
  }, [sheetNames, activeTab]);

  // Get data for the active sheet only
  const sheetData = useMemo(() => {
    const activeIndex = sheetNames.indexOf(activeTab);
    if (activeIndex === -1 || !results[activeIndex]) return [];

    const result = results[activeIndex];
    const days: DayData[] = [];

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
      });
    });

    days.sort((a, b) =>
      sortOrder === 'desc' ? b.fullDate - a.fullDate : a.fullDate - b.fullDate
    );

    return days;
  }, [results, sheetNames, activeTab, cycle, sortOrder]);

  // Get value type for the active sheet
  const isPercent = useMemo(() => {
    const activeIndex = sheetNames.indexOf(activeTab);
    return results[activeIndex]?.valueType === 'percent';
  }, [results, sheetNames, activeTab]);

  // Stats for this sheet
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

  const displayedDays = showAll ? sheetData : sheetData.slice(0, 8);

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
      {/* Tabs */}
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
                {/* Active sheet label */}
                <p className="text-sm font-medium text-foreground truncate mb-2" title={activeTab}>
                  {activeTab}
                </p>

                {/* Summary stats for this sheet only */}
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
                          {displayedDays.map((day) => (
                            <TableRow key={day.fullDate} className="h-11">
                              <TableCell className="text-sm py-2.5">{day.date}</TableCell>
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
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    
                    {sheetData.length > 8 && (
                      <div className="flex justify-center pt-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setShowAll(!showAll)}
                          className="h-7 text-xs"
                        >
                          {showAll ? 'Show less' : `Show all ${sheetData.length}`}
                        </Button>
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
