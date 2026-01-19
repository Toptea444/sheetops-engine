import { useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
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
  if (value >= 1000000) return `₦${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `₦${(value / 1000).toFixed(0)}K`;
  return `₦${value}`;
}

export function TrendChart({ results, cycle, isLoading }: TrendChartProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('daily');

  const chartData = useMemo(() => {
    const dayMap = new Map<number, { date: string; fullDate: number; value: number }>();

    results.forEach((result) => {
      // Skip percentage-based sheets in chart
      if (result.valueType === 'percent') return;

      result.dailyBreakdown?.forEach((day) => {
        if (day.fullDate === undefined) return;
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
        return { ...day, value: cumulative };
      });
    }

    return days;
  }, [results, cycle, viewMode]);

  const formatShortDate = (date: string) => {
    const parts = date.split(',');
    return parts[0] || date;
  };

  if (isLoading) {
    return <Skeleton className="h-[160px] w-full" />;
  }

  if (chartData.length === 0) {
    return (
      <div className="h-[120px] flex items-center justify-center text-sm text-muted-foreground border rounded-md bg-muted/20">
        No chart data for this cycle
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Earnings Trend</p>
        <div className="flex gap-0.5">
          <Button
            variant={viewMode === 'daily' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('daily')}
            className="h-6 text-[10px] px-2"
          >
            Daily
          </Button>
          <Button
            variant={viewMode === 'cumulative' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('cumulative')}
            className="h-6 text-[10px] px-2"
          >
            Total
          </Button>
        </div>
      </div>
      <div className="w-full overflow-hidden">
        <ResponsiveContainer width="100%" height={140}>
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              tickFormatter={formatShortDate}
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              interval="preserveStartEnd"
            />
            <YAxis
              tickFormatter={formatShortCurrency}
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              width={45}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="rounded border bg-popover px-2 py-1.5 text-xs shadow-md">
                      <p className="font-medium">{data.date}</p>
                      <p className="text-muted-foreground">
                        {viewMode === 'cumulative' ? 'Total: ' : ''}
                        ₦{data.value.toLocaleString()}
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="hsl(var(--primary))"
              strokeWidth={1.5}
              fill="url(#colorValue)"
              dot={false}
              activeDot={{ r: 3, fill: 'hsl(var(--primary))' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
