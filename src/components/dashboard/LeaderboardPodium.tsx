import { Crown, Medal, Trophy, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LeaderboardEntry } from '@/hooks/useLeaderboard';

interface LeaderboardPodiumProps {
  entries: LeaderboardEntry[];
  currentUserId: string | null;
}

function maskWorkerId(workerId: string): string {
  if (workerId.length <= 4) return workerId;
  const prefix = workerId.substring(0, 2);
  const suffix = workerId.substring(workerId.length - 4);
  return `${prefix}••${suffix}`;
}

export function LeaderboardPodium({ entries, currentUserId }: LeaderboardPodiumProps) {
  const top3 = entries.slice(0, 3);
  
  if (top3.length < 3) return null;

  const [first, second, third] = top3;

  return (
    <div className="relative py-6 px-4">
      {/* Decorative sparkles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <Sparkles className="absolute top-2 left-1/4 h-4 w-4 text-amber-400/40 animate-pulse" />
        <Sparkles className="absolute top-4 right-1/3 h-3 w-3 text-amber-500/30 animate-pulse delay-300" />
        <Sparkles className="absolute bottom-8 left-1/3 h-3 w-3 text-amber-400/20 animate-pulse delay-500" />
      </div>

      <div className="flex items-end justify-center gap-2 sm:gap-4">
        {/* Second Place */}
        <PodiumPlace
          entry={second}
          rank={2}
          isCurrentUser={second.isCurrentUser}
          height="h-20"
          bgGradient="from-slate-400/20 to-slate-300/10"
          borderColor="border-slate-400/40"
          icon={<Medal className="h-5 w-5 text-slate-400" />}
        />

        {/* First Place */}
        <PodiumPlace
          entry={first}
          rank={1}
          isCurrentUser={first.isCurrentUser}
          height="h-28"
          bgGradient="from-amber-500/20 to-yellow-400/10"
          borderColor="border-amber-500/50"
          icon={<Crown className="h-6 w-6 text-amber-500 animate-pulse" />}
          isWinner
        />

        {/* Third Place */}
        <PodiumPlace
          entry={third}
          rank={3}
          isCurrentUser={third.isCurrentUser}
          height="h-16"
          bgGradient="from-amber-600/20 to-orange-500/10"
          borderColor="border-amber-600/40"
          icon={<Trophy className="h-5 w-5 text-amber-600" />}
        />
      </div>
    </div>
  );
}

interface PodiumPlaceProps {
  entry: LeaderboardEntry;
  rank: number;
  isCurrentUser: boolean;
  height: string;
  bgGradient: string;
  borderColor: string;
  icon: React.ReactNode;
  isWinner?: boolean;
}

function PodiumPlace({
  entry,
  rank,
  isCurrentUser,
  height,
  bgGradient,
  borderColor,
  icon,
  isWinner,
}: PodiumPlaceProps) {
  return (
    <div className="flex flex-col items-center gap-2 animate-fade-in" style={{ animationDelay: `${(rank - 1) * 100}ms` }}>
      {/* Avatar */}
      <div className="relative">
        <div
          className={cn(
            'h-12 w-12 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-transform',
            isCurrentUser
              ? 'bg-primary text-primary-foreground border-primary scale-110'
              : `bg-gradient-to-br ${bgGradient} ${borderColor}`,
            isWinner && 'ring-2 ring-amber-400/50 ring-offset-2 ring-offset-background'
          )}
        >
          {entry.workerId.substring(0, 2).toUpperCase()}
        </div>
        {/* Crown/medal badge */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          {icon}
        </div>
      </div>

      {/* Name */}
      <span className={cn(
        'text-xs font-medium truncate max-w-[70px] text-center',
        isCurrentUser && 'text-primary'
      )}>
        {isCurrentUser ? 'You' : maskWorkerId(entry.workerId)}
      </span>

      {/* Podium stand */}
      <div
        className={cn(
          'w-16 sm:w-20 rounded-t-lg border-t border-x flex items-end justify-center pb-2 transition-all',
          `bg-gradient-to-t ${bgGradient} ${borderColor}`,
          height,
          isWinner && 'shadow-lg shadow-amber-500/20'
        )}
      >
        <span className={cn(
          'text-2xl font-bold',
          rank === 1 && 'text-amber-500',
          rank === 2 && 'text-slate-400',
          rank === 3 && 'text-amber-600'
        )}>
          {rank}
        </span>
      </div>
    </div>
  );
}
