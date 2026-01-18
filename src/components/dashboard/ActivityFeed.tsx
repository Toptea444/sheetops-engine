import { Calendar, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import type { BonusResult, DailyBonus } from '@/types/bonus';

interface ActivityFeedProps {
  results: BonusResult[];
  isLoading?: boolean;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function ActivityFeed({ results, isLoading }: ActivityFeedProps) {
  // Aggregate all daily data
  const allDays = results.flatMap(r => r.dailyBreakdown);
  
  // Sort by date descending (most recent first) and deduplicate
  const dateMap = new Map<string, DailyBonus>();
  for (const day of allDays) {
    const existing = dateMap.get(day.date);
    if (!existing || day.value > existing.value) {
      dateMap.set(day.date, day);
    }
  }
  
  const sortedDays = Array.from(dateMap.values())
    .filter(d => d.fullDate !== undefined)
    .sort((a, b) => (b.fullDate ?? 0) - (a.fullDate ?? 0));

  // Calculate average for comparison
  const activeDays = sortedDays.filter(d => d.value > 0);
  const average = activeDays.length > 0
    ? activeDays.reduce((sum, d) => sum + d.value, 0) / activeDays.length
    : 0;

  const getPerformanceIndicator = (value: number) => {
    if (value === 0) {
      return { 
        icon: <Minus className="h-4 w-4" />, 
        color: 'text-muted-foreground',
        bgColor: 'bg-muted',
        label: 'No bonus'
      };
    }
    if (value >= average * 1.2) {
      return { 
        icon: <TrendingUp className="h-4 w-4" />, 
        color: 'text-green-600 dark:text-green-400',
        bgColor: 'bg-green-100 dark:bg-green-900/30',
        label: 'Above average'
      };
    }
    if (value >= average * 0.8) {
      return { 
        icon: <Minus className="h-4 w-4" />, 
        color: 'text-amber-600 dark:text-amber-400',
        bgColor: 'bg-amber-100 dark:bg-amber-900/30',
        label: 'Average'
      };
    }
    return { 
      icon: <TrendingDown className="h-4 w-4" />, 
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-100 dark:bg-red-900/30',
      label: 'Below average'
    };
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="animate-pulse h-16 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (sortedDays.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-[200px] items-center justify-center text-muted-foreground">
            <p>No activity data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-3">
            {sortedDays.map((day, index) => {
              const indicator = getPerformanceIndicator(day.value);
              
              return (
                <div
                  key={`${day.date}-${index}`}
                  className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div className={`rounded-full p-2 ${indicator.bgColor}`}>
                      <span className={indicator.color}>{indicator.icon}</span>
                    </div>
                    <div>
                      <p className="font-medium">{day.date}</p>
                      <p className="text-xs text-muted-foreground">
                        {indicator.label}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${day.value > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {formatCurrency(day.value)}
                    </p>
                    {day.value > 0 && (
                      <Badge 
                        variant={day.value >= average ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {day.value >= average ? '+' : ''}{((day.value / average - 1) * 100).toFixed(0)}%
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
