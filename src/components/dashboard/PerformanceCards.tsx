import { TrendingUp, Calendar, Award, Flame, DollarSign } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { BonusResult } from '@/types/bonus';

interface PerformanceCardsProps {
  results: BonusResult[];
  isLoading?: boolean;
}

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  color?: 'primary' | 'success' | 'warning' | 'accent';
}

function StatCard({ title, value, subtitle, icon, color = 'primary' }: StatCardProps) {
  const colorClasses = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    warning: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
    accent: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  };

  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div className={`rounded-lg p-2 ${colorClasses[color]}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function PerformanceCards({ results, isLoading }: PerformanceCardsProps) {
  // Aggregate data from all results
  const allDays = results.flatMap(r => r.dailyBreakdown);
  
  // Calculate stats
  const totalEarnings = allDays.reduce((sum, d) => sum + d.value, 0);
  const activeDays = allDays.filter(d => d.value > 0).length;
  const averageDaily = activeDays > 0 ? totalEarnings / activeDays : 0;
  
  // Find best day
  const bestDay = allDays.reduce(
    (best, day) => (day.value > best.value ? day : best),
    { value: 0, date: 'N/A' }
  );

  // Calculate current streak (consecutive days with earnings from the end)
  const sortedDays = [...allDays]
    .filter(d => d.fullDate !== undefined)
    .sort((a, b) => (b.fullDate ?? 0) - (a.fullDate ?? 0));
  
  let currentStreak = 0;
  for (const day of sortedDays) {
    if (day.value > 0) {
      currentStreak++;
    } else {
      break;
    }
  }

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-16 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total Earnings"
        value={formatCurrency(totalEarnings)}
        subtitle="This period"
        icon={<DollarSign className="h-5 w-5" />}
        color="primary"
      />
      <StatCard
        title="Daily Average"
        value={formatCurrency(averageDaily)}
        subtitle={`${activeDays} active days`}
        icon={<TrendingUp className="h-5 w-5" />}
        color="success"
      />
      <StatCard
        title="Best Day"
        value={formatCurrency(bestDay.value)}
        subtitle={bestDay.date !== 'N/A' ? bestDay.date : undefined}
        icon={<Award className="h-5 w-5" />}
        color="warning"
      />
      <StatCard
        title="Current Streak"
        value={`${currentStreak} days`}
        subtitle="Consecutive earning days"
        icon={<Flame className="h-5 w-5" />}
        color="accent"
      />
    </div>
  );
}
