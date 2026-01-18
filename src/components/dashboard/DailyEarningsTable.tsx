import { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
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

interface AggregatedDay {
  date: string;
  fullDate: number;
  earnings: Record<string, number>;
  total: number;
}

export function DailyEarningsTable({
  results,
  sheetNames,
  cycle,
  isLoading,
}: DailyEarningsTableProps) {
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showAll, setShowAll] = useState(false);

  // Aggregate daily earnings from all sheets
  const aggregatedDays = useMemo(() => {
    const dayMap = new Map<number, AggregatedDay>();

    results.forEach((result, index) => {
      const sheetName = sheetNames[index];
      
      result.dailyBreakdown?.forEach((day) => {
        if (day.fullDate === undefined) return;

        // Check if this day is in the selected cycle
        const dayDate = new Date(day.fullDate);
        if (!isDateInCycle(dayDate, cycle)) return;

        const existing = dayMap.get(day.fullDate);
        if (existing) {
          existing.earnings[sheetName] = (existing.earnings[sheetName] || 0) + day.value;
          existing.total += day.value;
        } else {
          dayMap.set(day.fullDate, {
            date: day.date,
            fullDate: day.fullDate,
            earnings: { [sheetName]: day.value },
            total: day.value,
          });
        }
      });
    });

    const days = Array.from(dayMap.values());
    
    // Sort by date
    days.sort((a, b) => {
      return sortOrder === 'desc' ? b.fullDate - a.fullDate : a.fullDate - b.fullDate;
    });

    return days;
  }, [results, sheetNames, cycle, sortOrder]);

  // Calculate average for comparison
  const average = useMemo(() => {
    if (aggregatedDays.length === 0) return 0;
    const total = aggregatedDays.reduce((sum, day) => sum + day.total, 0);
    return total / aggregatedDays.length;
  }, [aggregatedDays]);

  const toggleSort = () => {
    setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
  };

  const displayedDays = showAll ? aggregatedDays : aggregatedDays.slice(0, 10);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Daily Earnings</CardTitle>
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

  if (aggregatedDays.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Daily Earnings</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            No earnings recorded for this cycle
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg">Daily Earnings</CardTitle>
        <Button variant="ghost" size="sm" onClick={toggleSort} className="gap-1">
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
      </CardHeader>
      <CardContent className="px-0 pb-4">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Date</TableHead>
                {sheetNames.map((name) => (
                  <TableHead key={name} className="text-right">
                    {name.split(' ')[0]}
                  </TableHead>
                ))}
                <TableHead className="text-right pr-6">Total</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayedDays.map((day) => {
                const isAboveAvg = day.total > average * 1.1;
                const isBelowAvg = day.total < average * 0.9;
                
                return (
                  <TableRow key={day.fullDate} className="group">
                    <TableCell className="pl-6 font-medium">
                      {day.date}
                    </TableCell>
                    {sheetNames.map((name) => (
                      <TableCell key={name} className="text-right text-muted-foreground">
                        {day.earnings[name] 
                          ? `₦${day.earnings[name].toLocaleString()}`
                          : '-'
                        }
                      </TableCell>
                    ))}
                    <TableCell className="text-right pr-6 font-semibold">
                      ₦{day.total.toLocaleString()}
                    </TableCell>
                    <TableCell className="w-10">
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
        
        {aggregatedDays.length > 10 && (
          <div className="flex justify-center pt-4 px-6">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowAll(!showAll)}
            >
              {showAll ? 'Show Less' : `Show All (${aggregatedDays.length} days)`}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
