import { useState, useMemo, useEffect } from 'react';
import { Trophy, Medal, Crown, User, Calendar, AlertCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { SheetData } from '@/types/bonus';
import type { CyclePeriod } from '@/lib/cycleUtils';
import { useLeaderboard, getWeeksInCycle, getCurrentWeekInCycle, type WeekPeriod } from '@/hooks/useLeaderboard';

interface LeaderboardPanelProps {
  sheetData: SheetData | null;
  currentUserId: string | null;
  currentUserName?: string | null;
  userStage: string | null;
  cycle: CyclePeriod;
}

function getRankIcon(rank: number) {
  switch (rank) {
    case 1:
      return <Crown className="h-5 w-5 text-amber-500" />;
    case 2:
      return <Medal className="h-5 w-5 text-slate-400" />;
    case 3:
      return <Medal className="h-5 w-5 text-amber-600" />;
    default:
      return <span className="w-5 h-5 flex items-center justify-center text-sm font-medium text-muted-foreground">{rank}</span>;
  }
}

function getRankBg(rank: number, isCurrentUser: boolean) {
  if (isCurrentUser) return 'bg-primary/10 border-primary/30';
  switch (rank) {
    case 1:
      return 'bg-gradient-to-r from-amber-500/10 to-yellow-500/5 border-amber-500/20';
    case 2:
      return 'bg-gradient-to-r from-slate-400/10 to-slate-300/5 border-slate-400/20';
    case 3:
      return 'bg-gradient-to-r from-amber-600/10 to-orange-500/5 border-amber-600/20';
    default:
      return 'bg-card/50 border-border/50';
  }
}

function formatDateShort(date: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}

export function LeaderboardPanel({
  sheetData,
  currentUserId,
  currentUserName,
  userStage,
  cycle,
}: LeaderboardPanelProps) {
  const [mode, setMode] = useState<'week' | 'cycle'>('week');
  
  const weeks = useMemo(() => getWeeksInCycle(cycle), [cycle]);
  const currentWeek = useMemo(() => getCurrentWeekInCycle(cycle), [cycle]);
  const [selectedWeekIndex, setSelectedWeekIndex] = useState<number>(() => {
    if (!currentWeek) return 0;
    const idx = weeks.findIndex(w => w.weekNumber === currentWeek.weekNumber);
    return idx >= 0 ? idx : 0;
  });

  // Reset selected week when cycle changes
  useEffect(() => {
    const newCurrentWeek = getCurrentWeekInCycle(cycle);
    if (newCurrentWeek) {
      const idx = weeks.findIndex(w => w.weekNumber === newCurrentWeek.weekNumber);
      setSelectedWeekIndex(idx >= 0 ? idx : 0);
    }
  }, [cycle, weeks]);

  const selectedWeek = weeks[selectedWeekIndex] || null;

  const { leaderboard, currentUserRank, totalParticipants, dataInfo, weekHasData } = useLeaderboard({
    sheetData,
    currentUserId,
    currentUserName,
    userStage,
    cycle,
    mode,
    selectedWeek: mode === 'week' ? selectedWeek : null,
  });

  // Show top 10 + current user if not in top 10
  const displayedEntries = useMemo(() => {
    const top10 = leaderboard.slice(0, 10);
    const currentUserEntry = leaderboard.find(e => e.isCurrentUser);
    
    if (currentUserEntry && currentUserEntry.rank > 10) {
      return [...top10, { ...currentUserEntry, showDivider: true }];
    }
    
    return top10;
  }, [leaderboard]);

  if (!sheetData) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        Search for your ID to see the leaderboard
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Leaderboard</h3>
          {userStage && (
            <Badge variant="secondary" className="text-xs">
              {userStage}
            </Badge>
          )}
        </div>
        {currentUserRank !== null && (
          <div className="text-sm text-muted-foreground">
            Your rank: <span className="font-semibold text-foreground">#{currentUserRank}</span> of {totalParticipants}
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={mode} onValueChange={(v) => setMode(v as 'week' | 'cycle')}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <TabsList className="h-9 p-0.5 bg-muted/40">
            <TabsTrigger value="week" className="text-sm h-8 px-4">
              Weekly
            </TabsTrigger>
            <TabsTrigger value="cycle" className="text-sm h-8 px-4">
              Cycle
            </TabsTrigger>
          </TabsList>

          {mode === 'week' && weeks.length > 0 && (
            <Select
              value={selectedWeekIndex.toString()}
              onValueChange={(v) => setSelectedWeekIndex(parseInt(v, 10))}
            >
              <SelectTrigger className="w-[180px] h-9 text-sm">
                <SelectValue placeholder="Select week" />
              </SelectTrigger>
              <SelectContent>
                {weeks.map((week, idx) => (
                  <SelectItem key={idx} value={idx.toString()}>
                    Week {week.weekNumber}: {week.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Data info banner for cycle mode */}
        {mode === 'cycle' && dataInfo.latestDataDate && (
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2">
            <Calendar className="h-3.5 w-3.5" />
            <span>
              Data available through <span className="font-medium text-foreground">{formatDateShort(dataInfo.latestDataDate)}</span>
              {dataInfo.totalDaysWithData > 0 && (
                <span className="ml-1">({dataInfo.totalDaysWithData} days)</span>
              )}
            </span>
          </div>
        )}

        <TabsContent value="week" className="mt-4">
          {!weekHasData ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                <AlertCircle className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">
                No data available for this week yet
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Data for {selectedWeek?.label} hasn't been uploaded
              </p>
            </div>
          ) : (
            <LeaderboardList entries={displayedEntries} currentUserId={currentUserId} />
          )}
        </TabsContent>

        <TabsContent value="cycle" className="mt-4">
          <LeaderboardList entries={displayedEntries} currentUserId={currentUserId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface LeaderboardListProps {
  entries: Array<{
    rank: number;
    workerId: string;
    stage: string;
    total: number;
    isCurrentUser: boolean;
    showDivider?: boolean;
  }>;
  currentUserId: string | null;
}

function LeaderboardList({ entries, currentUserId }: LeaderboardListProps) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        No data available for this period
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {entries.map((entry, idx) => (
        <div key={entry.workerId}>
          {entry.showDivider && (
            <div className="flex items-center gap-2 py-2">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">Your position</span>
              <div className="flex-1 h-px bg-border" />
            </div>
          )}
          <div
            className={cn(
              'flex items-center gap-3 p-3 rounded-lg border transition-colors',
              getRankBg(entry.rank, entry.isCurrentUser)
            )}
          >
            {/* Rank */}
            <div className="flex items-center justify-center w-8">
              {getRankIcon(entry.rank)}
            </div>

            {/* Avatar */}
            <div className={cn(
              'h-9 w-9 rounded-full flex items-center justify-center text-sm font-medium',
              entry.isCurrentUser 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted text-muted-foreground'
            )}>
              {entry.workerId.substring(0, 2).toUpperCase()}
            </div>

            {/* Name */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={cn(
                  'font-medium truncate',
                  entry.isCurrentUser && 'text-primary'
                )}>
                  {entry.isCurrentUser ? 'You' : maskWorkerId(entry.workerId)}
                </span>
                {entry.isCurrentUser && (
                  <User className="h-4 w-4 text-primary" />
                )}
              </div>
            </div>

            {/* Amount */}
            <div className="text-right">
              {entry.isCurrentUser ? (
                <span className="font-semibold text-primary">
                  ₦{entry.total.toLocaleString()}
                </span>
              ) : (
                <span className="text-muted-foreground text-sm">•••</span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Mask worker ID for privacy (e.g., "GHAS1234" -> "GH••1234")
 */
function maskWorkerId(workerId: string): string {
  if (workerId.length <= 4) return workerId;
  const prefix = workerId.substring(0, 2);
  const suffix = workerId.substring(workerId.length - 4);
  return `${prefix}••${suffix}`;
}
