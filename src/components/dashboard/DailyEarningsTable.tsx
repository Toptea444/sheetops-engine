import { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import type { BonusResult, DailyBonus } from '@/types/bonus';
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

  // Calculate average for comparison
  const average = useMemo(() => {
    if (sheetData.length === 0) return 0;
    const total = sheetData.reduce((sum, day) => sum + day.value, 0);
    return total / sheetData.length;
  }, [sheetData]);

  // Calculate total for this sheet
  const total = useMemo(() => {
    return sheetData.reduce((sum, day) => sum + day.value, 0);
  }, [sheetData]);

  const toggleSort = () => {
    setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
  };

  const displayedDays = showAll ? sheetData : sheetData.slice(0, 10);

  // Update active tab when sheet names change
  useMemo(() => {
    if (!sheetNames.includes(activeTab) && sheetNames.length > 0) {
      setActiveTab(sheetNames[0]);
    }
  }, [sheetNames, activeTab]);

  const formatValue = (value: number) => {
    if (isPercent) {
      return `${value.toFixed(1)}%`;
    }
    return `₦${value.toLocaleString()}`;
  };

  if (isLoading) {
    return (
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Calendar className="h-4 w-4 text-primary" />
            </div>
            Daily Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Calendar className="h-4 w-4 text-primary" />
            </div>
            Daily Breakdown
          </CardTitle>
          <Button variant="outline" size="sm" onClick={toggleSort} className="gap-2 self-start">
            {sortOrder === 'desc' ? (
              <>
                <ChevronDown className="h-4 w-4" />
                Newest first
              </>
            ) : (
              <>
                <ChevronUp className="h-4 w-4" />
                Oldest first
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full justify-start h-auto p-1 bg-muted/50 flex-wrap gap-1">
            {sheetNames.map((name) => (
              <TabsTrigger 
                key={name} 
                value={name}
                className="text-xs px-3 py-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                {name.split(' ')[0]}
              </TabsTrigger>
            ))}
          </TabsList>

          {sheetNames.map((name) => (
            <TabsContent key={name} value={name} className="mt-4">
              {name === activeTab && (
                <>
                  {/* Summary for this sheet */}
                  <div className="grid grid-cols-3 gap-4 mb-4 p-4 bg-muted/30 rounded-lg border border-border/50">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Total</p>
                      <p className="text-lg font-semibold">{formatValue(total)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Average</p>
                      <p className="text-lg font-semibold">{formatValue(average)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Entries</p>
                      <p className="text-lg font-semibold">{sheetData.length}</p>
                    </div>
                  </div>

                  {sheetData.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No entries recorded for this cycle
                    </p>
                  ) : (
                    <>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="hover:bg-transparent">
                              <TableHead className="font-semibold">Date</TableHead>
                              <TableHead className="text-right font-semibold">
                                {isPercent ? 'Percentage' : 'Amount'}
                              </TableHead>
                              <TableHead className="w-12"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {displayedDays.map((day) => {
                              const isAboveAvg = day.value > average * 1.1;
                              const isBelowAvg = day.value < average * 0.9;
                              
                              return (
                                <TableRow key={day.fullDate} className="group">
                                  <TableCell className="font-medium">
                                    {day.date}
                                  </TableCell>
                                  <TableCell className="text-right font-semibold">
                                    {formatValue(day.value)}
                                  </TableCell>
                                  <TableCell className="w-12">
                                    {isAboveAvg && (
                                      <TrendingUp className="h-4 w-4 text-success" />
                                    )}
                                    {isBelowAvg && (
                                      <TrendingDown className="h-4 w-4 text-warning" />
                                    )}
                                    {!isAboveAvg && !isBelowAvg && (
                                      <Minus className="h-4 w-4 text-muted-foreground/50" />
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                      
                      {sheetData.length > 10 && (
                        <div className="flex justify-center pt-4">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setShowAll(!showAll)}
                          >
                            {showAll ? 'Show Less' : `Show All (${sheetData.length} entries)`}
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
      </CardContent>
    </Card>
  );
}
