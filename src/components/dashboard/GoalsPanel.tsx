import { useState, useEffect, useRef } from 'react';
import { Edit3, Check, X, CheckCircle2, Target, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useConfetti } from '@/hooks/useConfetti';
import type { BonusResult } from '@/types/bonus';
import type { CyclePeriod } from '@/lib/cycleUtils';
import { isDateInCycle, getCycleKey } from '@/lib/cycleUtils';
import { cn } from '@/lib/utils';

interface GoalsPanelProps {
  results: BonusResult[];
  cycle: CyclePeriod;
  cycleTarget: number;
  onUpdateCycleTarget: (target: number, cycleKey: string) => void;
}

export function GoalsPanel({
  results,
  cycle,
  cycleTarget,
  onUpdateCycleTarget,
}: GoalsPanelProps) {
  const { triggerGoalComplete } = useConfetti();
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(cycleTarget.toString());
  const wasCompleteRef = useRef(false);

  let cycleTotal = 0;

  results.forEach((result) => {
    if (result.valueType === 'percent') return;

    result.dailyBreakdown?.forEach((day) => {
      if (day.fullDate === undefined) return;
      const dayDate = new Date(day.fullDate);
      if (isDateInCycle(dayDate, cycle)) {
        cycleTotal += day.value;
      }
    });
  });

  const cycleKey = getCycleKey(cycle);
  const progress = cycleTarget > 0 ? Math.min((cycleTotal / cycleTarget) * 100, 100) : 0;
  const isComplete = cycleTotal >= cycleTarget && cycleTarget > 0;

  // Trigger celebration when goal is newly completed
  useEffect(() => {
    if (isComplete && !wasCompleteRef.current) {
      triggerGoalComplete(`cycle-${cycleKey}`);
    }
    wasCompleteRef.current = isComplete;
  }, [isComplete, cycleKey, triggerGoalComplete]);

  // Sync input value when cycleTarget changes
  useEffect(() => {
    setInputValue(cycleTarget.toString());
  }, [cycleTarget]);

  const handleSave = () => {
    const parsed = parseFloat(inputValue);
    if (!isNaN(parsed) && parsed >= 0) {
      onUpdateCycleTarget(parsed, cycleKey);
    }
    setIsEditing(false);
  };

  // Calculate days remaining in cycle
  const daysRemaining = Math.max(0, Math.ceil((cycle.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Cycle Goal</span>
        </div>
        {daysRemaining > 0 && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {daysRemaining}d left
          </span>
        )}
      </div>

      {/* Goal card */}
      <div className={cn(
        'p-3 rounded-lg border transition-all duration-300',
        isComplete
          ? 'bg-success/5 border-success/30'
          : 'bg-muted/20 border-border/60'
      )}>
        <div className="flex items-start gap-3">
          <div className={cn(
            'h-8 w-8 rounded-full flex items-center justify-center shrink-0',
            isComplete ? 'bg-success/20' : 'bg-muted'
          )}>
            {isComplete ? (
              <CheckCircle2 className="h-4 w-4 text-success" />
            ) : (
              <Target className="h-4 w-4 text-primary" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className={cn(
                'text-sm font-medium',
                isComplete && 'text-success'
              )}>
                {isComplete ? 'Goal Reached!' : 'Earnings Target'}
              </span>
              {isComplete && (
                <Badge variant="secondary" className="text-xs shrink-0">
                  🎉 Complete
                </Badge>
              )}
            </div>
            
            {/* Editable target */}
            <div className="flex items-center gap-1 mt-0.5">
              {isEditing ? (
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">₦</span>
                  <Input
                    type="number"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    className="h-6 w-20 text-xs px-1"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSave();
                      if (e.key === 'Escape') setIsEditing(false);
                    }}
                  />
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleSave}>
                    <Check className="h-3 w-3 text-success" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setIsEditing(false)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {cycleTarget > 0 ? `Target: ₦${cycleTarget.toLocaleString()}` : 'Click to set target'}
                  <Edit3 className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Progress bar */}
            <div className="mt-2">
              <Progress 
                value={progress} 
                animated={!isComplete && cycleTarget > 0}
                className={cn('h-1.5', isComplete && '[&>div]:bg-success')} 
              />
              <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                <span>₦{cycleTotal.toLocaleString()}</span>
                {cycleTarget > 0 && <span>₦{cycleTarget.toLocaleString()}</span>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
