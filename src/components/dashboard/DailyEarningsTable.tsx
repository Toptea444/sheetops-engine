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
  value: number;
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

      days.push({
        date: day.date,
        fullDate: day.fullDate,
        value: day.value,
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
    const total = sheetData.reduce((sum, day) => sum + day.value, 0);
    const avg = sheetData.length > 0 ? total / sheetData.length : 0;
    return { total, avg, count: sheetData.length };
  }, [sheetData]);

  const formatValue = (value: number) => {
    if (isPercent) return `${value.toFixed(1)}%`;
    return `₦${value.toLocaleString()}`;
  };

  const displayedDays = showAll ? sheetData : sheetData.slice(0, 8);

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
          <TabsList className="h-8 p-0.5 bg-muted/50">
            {sheetNames.map((name) => (
              <TabsTrigger 
                key={name} 
                value={name}
                className="text-xs h-7 px-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                {name.split(' ')[0]}
              </TabsTrigger>
            ))}
          </TabsList>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
            className="h-7 text-xs gap-1 text-muted-foreground"
          >
            {sortOrder === 'desc' ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
            {sortOrder === 'desc' ? 'Newest' : 'Oldest'}
          </Button>
        </div>

        {sheetNames.map((name) => (
          <TabsContent key={name} value={name} className="mt-3">
            {name === activeTab && (
              <>
                {/* Summary stats for this sheet only */}
                <div className="grid grid-cols-3 gap-2 mb-3 p-2.5 bg-muted/30 rounded-md text-center">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total</p>
                    <p className="text-sm font-semibold">{formatValue(stats.total)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Average</p>
                    <p className="text-sm font-semibold">{formatValue(stats.avg)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Entries</p>
                    <p className="text-sm font-semibold">{stats.count}</p>
                  </div>
                </div>

                {sheetData.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-6">
                    No entries for this cycle
                  </p>
                ) : (
                  <>
                    <div className="border rounded-md overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent bg-muted/30">
                            <TableHead className="text-xs font-medium h-8">Date</TableHead>
                            <TableHead className="text-xs font-medium h-8 text-right">
                              {isPercent ? 'Bonus %' : 'Amount'}
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {displayedDays.map((day) => (
                            <TableRow key={day.fullDate} className="h-9">
                              <TableCell className="text-xs py-2">{day.date}</TableCell>
                              <TableCell className="text-xs py-2 text-right font-medium">
                                {formatValue(day.value)}
                              </TableCell>
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
