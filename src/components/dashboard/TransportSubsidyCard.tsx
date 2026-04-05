import { useEffect } from 'react';
import { Bus, User, CalendarDays, BarChart3, Coins } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { TransportSubsidyData } from '@/hooks/useTransportSubsidy';

interface TransportSubsidyCardProps {
  kId: string;
  subsidyData: TransportSubsidyData | null;
  isLoading: boolean;
  isFetching: boolean;
  onFetch: (kId: string) => void;
}

export function TransportSubsidyCard({ kId, subsidyData, isLoading, isFetching, onFetch }: TransportSubsidyCardProps) {
  useEffect(() => {
    if (kId && !subsidyData && !isFetching) {
      onFetch(kId);
    }
  }, [kId, subsidyData, isFetching, onFetch]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <Bus className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Transport Subsidy</span>
        </div>
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    );
  }

  if (!subsidyData) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bus className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Transport Subsidy</span>
        </div>
        <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
          {kId.toUpperCase()}
        </span>
      </div>

      {/* Name */}
      <div className="flex items-center gap-2">
        <User className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-sm font-medium truncate">{subsidyData.name}</span>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-0.5">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Working Days</p>
          <p className="text-sm font-semibold">{subsidyData.workingDays}</p>
        </div>
        <div className="space-y-0.5">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Days Present</p>
          <p className="text-sm font-semibold">{subsidyData.daysPresent}</p>
        </div>
        <div className="space-y-0.5">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Attendance</p>
          <p className="text-sm font-semibold">{subsidyData.attendanceRate}</p>
        </div>
        <div className="space-y-0.5">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Amount</p>
          <p className="text-sm font-bold text-primary">₦{subsidyData.actualSubsidy.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}
