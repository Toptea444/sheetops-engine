import { TrendingUp, Calendar, Target, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { CyclePeriod } from '@/lib/cycleUtils';
import { getDaysElapsedInCycle, getDaysRemainingInCycle, getTotalDaysInCycle } from '@/lib/cycleUtils';

interface CycleSummaryCardProps {
  cycle: CyclePeriod;
  totalEarnings: number;
  daysActive: number;
  isLoading?: boolean;
}

export function CycleSummaryCard({
  cycle,
  totalEarnings,
  daysActive,
  isLoading,
}: CycleSummaryCardProps) {
  const daysElapsed = getDaysElapsedInCycle(cycle);
  const daysRemaining = getDaysRemainingInCycle(cycle);
  const totalDays = getTotalDaysInCycle(cycle);
  const avgDaily = daysActive > 0 ? totalEarnings / daysActive : 0;
  const progressPercent = (daysElapsed / totalDays) * 100;

  if (isLoading) {
    return (
      <Card className="border-0 shadow-lg bg-gradient-to-br from-primary to-primary/80">
        <CardContent className="p-6">
          <div className="space-y-4">
            <Skeleton className="h-8 w-48 bg-primary-foreground/20" />
            <Skeleton className="h-12 w-32 bg-primary-foreground/20" />
            <div className="flex gap-8">
              <Skeleton className="h-6 w-24 bg-primary-foreground/20" />
              <Skeleton className="h-6 w-24 bg-primary-foreground/20" />
              <Skeleton className="h-6 w-24 bg-primary-foreground/20" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg bg-gradient-to-br from-primary to-primary/80 text-primary-foreground overflow-hidden">
      <CardContent className="p-6 md:p-8">
        {/* Cycle Progress Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-primary-foreground/20">
          <div 
            className="h-full bg-primary-foreground/60 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="space-y-6">
          {/* Cycle Label */}
          <div className="flex items-center gap-2 text-primary-foreground/80">
            <Calendar className="h-5 w-5" />
            <span className="text-lg font-medium">{cycle.label}</span>
          </div>

          {/* Total Earnings - Hero Number */}
          <div>
            <p className="text-sm text-primary-foreground/70 mb-1">Total Earnings</p>
            <p className="text-4xl md:text-5xl font-bold tracking-tight">
              ₦{totalEarnings.toLocaleString()}
            </p>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-primary-foreground/20">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-primary-foreground/70">
                <Target className="h-4 w-4" />
                <span className="text-xs">Days Active</span>
              </div>
              <p className="text-2xl font-semibold">{daysActive}</p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-primary-foreground/70">
                <TrendingUp className="h-4 w-4" />
                <span className="text-xs">Daily Avg</span>
              </div>
              <p className="text-2xl font-semibold">₦{Math.round(avgDaily).toLocaleString()}</p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-primary-foreground/70">
                <Clock className="h-4 w-4" />
                <span className="text-xs">Days Left</span>
              </div>
              <p className="text-2xl font-semibold">{daysRemaining}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
