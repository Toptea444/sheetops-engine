import { TrendingUp, Calendar, Activity, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
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
      <Card className="border-2 shadow-sm">
        <CardContent className="p-6">
          <div className="space-y-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-10 w-32" />
            <div className="grid grid-cols-3 gap-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 shadow-sm overflow-hidden">
      <CardContent className="p-0">
        {/* Header Section */}
        <div className="bg-primary/5 border-b border-border p-4 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Current Cycle</p>
                <p className="text-lg font-semibold text-foreground">{cycle.label}</p>
              </div>
            </div>
            
            {/* Progress indicator */}
            <div className="flex items-center gap-3 min-w-[200px]">
              <Progress value={progressPercent} className="h-2 flex-1" />
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                Day {daysElapsed} of {totalDays}
              </span>
            </div>
          </div>
        </div>

        {/* Main Stats */}
        <div className="p-4 md:p-6">
          {/* Hero Number */}
          <div className="mb-6">
            <p className="text-sm text-muted-foreground mb-1">Total Earnings</p>
            <p className="text-4xl md:text-5xl font-bold text-foreground tracking-tight">
              ₦{totalEarnings.toLocaleString()}
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Activity className="h-4 w-4" />
                <span className="text-xs font-medium">Days Active</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{daysActive}</p>
            </div>

            <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <TrendingUp className="h-4 w-4" />
                <span className="text-xs font-medium">Daily Avg</span>
              </div>
              <p className="text-2xl font-bold text-foreground">₦{Math.round(avgDaily).toLocaleString()}</p>
            </div>

            <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Clock className="h-4 w-4" />
                <span className="text-xs font-medium">Days Left</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{daysRemaining}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
