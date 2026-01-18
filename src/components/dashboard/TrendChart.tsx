import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { TrendingUp } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  AreaChart,
} from 'recharts';
import type { BonusResult } from '@/types/bonus';
import type { CyclePeriod } from '@/lib/cycleUtils';
import { isDateInCycle } from '@/lib/cycleUtils';

interface TrendChartProps {
  results: BonusResult[];
  cycle: CyclePeriod;
  isLoading?: boolean;
}

type ViewMode = 'daily' | 'cumulative';

function formatShortCurrency(value: number): string {
  if (value >= 1000000) {
    return `₦${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `₦${(value / 1000).toFixed(0)}K`;
  }
  return `₦${value}`;
}

export function TrendChart({ results, cycle, isLoading }: TrendChartProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('daily');

  // Aggregate daily earnings from all results for the current cycle
  const chartData = useMemo(() => {
    const dayMap = new Map<number, { date: string; fullDate: number; value: number }>();

    results.forEach((result) => {
      result.dailyBreakdown?.forEach((day) => {
        if (day.fullDate === undefined) return;

        // Check if this day is in the selected cycle
        const dayDate = new Date(day.fullDate);
        if (!isDateInCycle(dayDate, cycle)) return;

        const existing = dayMap.get(day.fullDate);
        if (existing) {
          existing.value += day.value;
        } else {
          dayMap.set(day.fullDate, {
            date: day.date,
            fullDate: day.fullDate,
            value: day.value,
          });
        }
      });
    });

    const days = Array.from(dayMap.values()).sort((a, b) => a.fullDate - b.fullDate);

    if (viewMode === 'cumulative') {
      let cumulative = 0;
      return days.map((day) => {
        cumulative += day.value;
        return {
          ...day,
          value: cumulative,
        };
      });
    }

    return days;
  }, [results, cycle, viewMode]);

  // Calculate average for reference line
  const average = useMemo(() => {
    if (chartData.length === 0 || viewMode === 'cumulative') return 0;
    const total = chartData.reduce((sum, d) => sum + d.value, 0);
    return Math.round(total / chartData.length);
  }, [chartData, viewMode]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5" />
            Earnings Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5" />
            Earnings Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            No data available for this cycle
          </div>
        </CardContent>
      </Card>
    );
  }

  // Format the date for tooltip and X axis
  const formatShortDate = (date: string) => {
    // date is like "Jan 16, Thu" - extract just "Jan 16"
    const parts = date.split(',');
    return parts[0] || date;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="h-5 w-5" />
          Earnings Trend
        </CardTitle>
        <div className="flex gap-1">
          <Button
            variant={viewMode === 'daily' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('daily')}
          >
            Daily
          </Button>
          <Button
            variant={viewMode === 'cumulative' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('cumulative')}
          >
            Cumulative
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="date"
              tickFormatter={formatShortDate}
              fontSize={12}
              tickLine={false}
              axisLine={false}
              className="text-muted-foreground"
              interval="preserveStartEnd"
            />
            <YAxis
              tickFormatter={(value) => formatShortCurrency(value)}
              fontSize={12}
              tickLine={false}
              axisLine={false}
              className="text-muted-foreground"
              width={50}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="rounded-lg border bg-background p-2 shadow-sm">
                      <p className="text-sm font-medium">{data.date}</p>
                      <p className="text-sm text-muted-foreground">
                        {viewMode === 'cumulative' ? 'Total: ' : ''}
                        ₦{data.value.toLocaleString()}
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            {viewMode === 'daily' && average > 0 && (
              <ReferenceLine
                y={average}
                stroke="hsl(var(--success))"
                strokeDasharray="5 5"
                label={{
                  value: `Avg: ₦${average.toLocaleString()}`,
                  position: 'right',
                  fontSize: 11,
                  fill: 'hsl(var(--success))',
                }}
              />
            )}
            <Area
              type="monotone"
              dataKey="value"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fill="url(#colorValue)"
              dot={{ fill: 'hsl(var(--primary))', strokeWidth: 0, r: 3 }}
              activeDot={{ r: 5, fill: 'hsl(var(--primary))' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
