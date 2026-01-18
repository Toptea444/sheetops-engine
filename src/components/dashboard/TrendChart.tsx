import { useState } from 'react';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp } from 'lucide-react';
import type { BonusResult, DailyBonus } from '@/types/bonus';

interface TrendChartProps {
  results: BonusResult[];
  isLoading?: boolean;
}

type TimeRange = '7d' | '14d' | '30d' | 'all';

const timeRangeLabels: Record<TimeRange, string> = {
  '7d': 'Last 7 Days',
  '14d': 'Last 14 Days',
  '30d': 'Last 30 Days',
  'all': 'All Time',
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatShortCurrency(value: number): string {
  if (value >= 1000000) {
    return `₦${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `₦${(value / 1000).toFixed(0)}K`;
  }
  return `₦${value}`;
}

export function TrendChart({ results, isLoading }: TrendChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');

  // Aggregate all daily data
  const allDays = results.flatMap(r => r.dailyBreakdown);
  
  // Sort by date and deduplicate (take max value per date)
  const dateMap = new Map<string, DailyBonus>();
  for (const day of allDays) {
    const existing = dateMap.get(day.date);
    if (!existing || day.value > existing.value) {
      dateMap.set(day.date, day);
    }
  }
  
  const sortedDays = Array.from(dateMap.values())
    .filter(d => d.fullDate !== undefined)
    .sort((a, b) => (a.fullDate ?? 0) - (b.fullDate ?? 0));

  // Filter by time range
  const now = Date.now();
  const msPerDay = 24 * 60 * 60 * 1000;
  const rangeDays: Record<TimeRange, number> = {
    '7d': 7,
    '14d': 14,
    '30d': 30,
    'all': Infinity,
  };

  const filteredDays = sortedDays.filter(day => {
    if (timeRange === 'all') return true;
    const dayTime = day.fullDate ?? 0;
    return now - dayTime <= rangeDays[timeRange] * msPerDay;
  });

  // Calculate average for reference line
  const activeDays = filteredDays.filter(d => d.value > 0);
  const average = activeDays.length > 0
    ? activeDays.reduce((sum, d) => sum + d.value, 0) / activeDays.length
    : 0;

  // Prepare chart data
  const chartData = filteredDays.map(day => ({
    date: day.date.split(',')[0], // Short date format
    value: day.value,
    fullDate: day.date,
  }));

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Performance Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] animate-pulse bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Performance Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-[300px] items-center justify-center text-muted-foreground">
            <p>No performance data available for the selected period</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Performance Trend
        </CardTitle>
        <div className="flex gap-1">
          {(Object.keys(timeRangeLabels) as TimeRange[]).map((range) => (
            <Button
              key={range}
              variant={timeRange === range ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setTimeRange(range)}
              className="text-xs"
            >
              {range === 'all' ? 'All' : range}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(215, 70%, 45%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(215, 70%, 45%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
                interval="preserveStartEnd"
              />
              <YAxis 
                tickFormatter={(value) => formatShortCurrency(value)}
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
                width={60}
              />
              <Tooltip
                formatter={(value: number) => [formatCurrency(value), 'Bonus']}
                labelFormatter={(label) => `Date: ${label}`}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <ReferenceLine 
                y={average} 
                stroke="hsl(145, 60%, 45%)" 
                strokeDasharray="5 5"
                label={{ 
                  value: `Avg: ${formatShortCurrency(average)}`, 
                  position: 'right',
                  fill: 'hsl(145, 60%, 45%)',
                  fontSize: 12,
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="hsl(215, 70%, 45%)"
                strokeWidth={2}
                fill="url(#colorValue)"
                dot={{ fill: 'hsl(215, 70%, 45%)', strokeWidth: 0, r: 3 }}
                activeDot={{ r: 6, fill: 'hsl(215, 70%, 45%)' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 flex items-center justify-center gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-primary" />
            <span>Daily Bonus</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-0.5 w-6 bg-green-500" style={{ borderStyle: 'dashed' }} />
            <span>Average ({formatShortCurrency(average)})</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
