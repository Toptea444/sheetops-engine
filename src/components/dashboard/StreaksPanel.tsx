import { Flame, Trophy, Zap, Calendar, Info } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { StreakData, Achievement } from '@/hooks/useStreaksAndAchievements';

interface StreaksPanelProps {
  streakData: StreakData;
  achievements: Achievement[];
  totalUnlocked: number;
  isLoading?: boolean;
}

export function StreaksPanel({
  streakData,
  achievements,
  totalUnlocked,
  isLoading,
}: StreaksPanelProps) {
  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-16 bg-muted rounded-lg" />
        <div className="h-24 bg-muted rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Streak Card */}
      <div className="p-4 rounded-lg bg-gradient-to-br from-warning/20 to-destructive/10 border border-warning/30">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-warning/30 flex items-center justify-center">
              <Flame className="h-4 w-4 text-warning" />
            </div>
            <div>
              <p className="text-sm font-medium">Current Streak</p>
              <p className="text-xs text-muted-foreground">
                {streakData.streakActive ? 'Keep it up!' : 'Work today to start!'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-warning">
              {streakData.currentStreak}
            </p>
            <p className="text-xs text-muted-foreground">days</p>
          </div>
        </div>
        
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Trophy className="h-3 w-3" />
            Best: {streakData.longestStreak} days
          </span>
          {streakData.lastWorkDate && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Last: {streakData.lastWorkDate.toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      {/* Achievements */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            Achievements
          </p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {totalUnlocked}/{achievements.length}
            </span>
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground"
                  aria-label="How achievements work"
                >
                  <Info className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>How achievements work</DialogTitle>
                  <DialogDescription>
                    Achievements are small goals based on your work days, streaks, and earnings.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-3 text-sm">
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    <li>
                      <span className="font-medium text-foreground">Work day</span> = a day with earnings &gt; 0.
                    </li>
                    <li>
                      <span className="font-medium text-foreground">Streak</span> = consecutive work days.
                    </li>
                    <li>
                      <span className="font-medium text-foreground">Cycle</span> achievements use the currently selected cycle.
                    </li>
                    <li>
                      <span className="font-medium text-foreground">All-time</span> achievements look across all loaded sheets.
                    </li>
                  </ul>
                  <p className="text-xs text-muted-foreground">
                    Tip: Hover (desktop) or tap (mobile) an icon to see the exact requirement and your progress.
                  </p>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <p className="text-xs text-muted-foreground mb-3">
          Based on your activity. Hover/tap an icon to see what it means.
        </p>

        <TooltipProvider delayDuration={0}>
          <div className="grid grid-cols-5 gap-2">
            {achievements.map((achievement) => (
              <Tooltip key={achievement.id}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label={`${achievement.name}: ${achievement.description}`}
                    className={`
                      relative h-11 w-11 rounded-lg flex items-center justify-center text-lg
                      transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary
                      ${
                        achievement.unlocked
                          ? 'bg-primary/10 border-2 border-primary/30 shadow-sm'
                          : 'bg-muted/50 border border-border/50 grayscale opacity-50'
                      }
                    `}
                  >
                    {achievement.icon}
                    {!achievement.unlocked && achievement.progress !== undefined && (
                      <div className="absolute -bottom-1 left-1 right-1">
                        <Progress 
                          value={(achievement.progress / (achievement.target || 1)) * 100} 
                          className="h-0.5"
                        />
                      </div>
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent 
                  side="top" 
                  className="max-w-[220px] z-[100]"
                  sideOffset={8}
                  onPointerDownOutside={(e) => e.preventDefault()}
                >
                  <p className="font-medium">{achievement.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {achievement.description}
                  </p>
                  {!achievement.unlocked && achievement.progress !== undefined && (
                    <p className="text-xs text-primary mt-1">
                      Progress: {achievement.progress.toLocaleString()} / {achievement.target?.toLocaleString()}
                    </p>
                  )}
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </TooltipProvider>
      </div>
    </div>
  );
}
