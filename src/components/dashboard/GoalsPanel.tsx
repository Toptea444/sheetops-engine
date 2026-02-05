import { useState, useEffect, useRef } from 'react';
import { Edit3, Check, X, CheckCircle, Sparkles, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

interface GoalRowProps {
  label: string;
  current: number;
  target: number;
  goalKey: string;
  onUpdateTarget: (target: number) => void;
  onGoalComplete?: (key: string) => void;
}

function GoalRow({ label, current, target, goalKey, onUpdateTarget, onGoalComplete }: GoalRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(target.toString());
  const [showCelebration, setShowCelebration] = useState(false);
  const wasCompleteRef = useRef(false);

  const progress = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  const isComplete = current >= target && target > 0;

  // Trigger celebration when goal is newly completed
  useEffect(() => {
    if (isComplete && !wasCompleteRef.current) {
      setShowCelebration(true);
      onGoalComplete?.(goalKey);
      setTimeout(() => setShowCelebration(false), 2000);
    }
    wasCompleteRef.current = isComplete;
  }, [isComplete, goalKey, onGoalComplete]);

  const handleSave = () => {
    const parsed = parseFloat(inputValue);
    if (!isNaN(parsed) && parsed >= 0) {
      onUpdateTarget(parsed);
    }
    setIsEditing(false);
  };

  return (
    <div className={cn(
      'relative overflow-hidden rounded-xl p-4 transition-all duration-300',
      showCelebration 
        ? 'bg-gradient-to-br from-success/20 via-success/10 to-transparent ring-2 ring-success/30' 
        : isComplete 
          ? 'bg-gradient-to-br from-success/15 to-success/5' 
          : 'bg-gradient-to-br from-primary/10 via-primary/5 to-transparent'
    )}>
      {/* Background decoration */}
      <div className={cn(
        'absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl -mr-8 -mt-8 transition-colors duration-300',
        isComplete ? 'bg-success/20' : 'bg-primary/15'
      )} />
      
      {/* Header */}
      <div className="relative flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={cn(
            'h-8 w-8 rounded-lg flex items-center justify-center',
            isComplete ? 'bg-success/20' : 'bg-primary/20'
          )}>
            {isComplete ? (
              <CheckCircle className="h-4 w-4 text-success" />
            ) : showCelebration ? (
              <Sparkles className="h-4 w-4 text-success animate-pulse" />
            ) : (
              <Target className="h-4 w-4 text-primary" />
            )}
          </div>
          <span className="font-semibold text-sm">{label} Goal</span>
        </div>
        {isEditing ? (
          <div className="flex items-center gap-1">
            <Input
              type="number"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="h-8 w-24 text-sm px-2"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
                if (e.key === 'Escape') setIsEditing(false);
              }}
            />
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleSave}>
              <Check className="h-4 w-4 text-success" />
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setIsEditing(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-sm gap-1.5 text-muted-foreground hover:text-foreground"
            onClick={() => {
              setInputValue(target.toString());
              setIsEditing(true);
            }}
          >
            {target > 0 ? `Target: ₦${target.toLocaleString()}` : 'Set Target'}
            <Edit3 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
      
      {/* Progress bar */}
      <div className="relative h-3 bg-muted/50 rounded-full overflow-hidden mb-3">
        <div 
          className={cn(
            'absolute inset-y-0 left-0 rounded-full transition-all duration-500',
            isComplete 
              ? 'bg-gradient-to-r from-success to-success/80' 
              : 'bg-gradient-to-r from-primary to-primary/70'
          )}
          style={{ width: `${progress}%` }}
        >
          {/* Animated shimmer effect for in-progress goals */}
          {!isComplete && target > 0 && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
          )}
        </div>
      </div>
      
      {/* Stats */}
      <div className="relative flex justify-between items-center">
        <div>
          <span className="text-lg font-bold">₦{current.toLocaleString()}</span>
          {target > 0 && (
            <span className="text-sm text-muted-foreground ml-1">/ ₦{target.toLocaleString()}</span>
          )}
        </div>
        {isComplete ? (
          <span className="text-sm font-medium text-success">Complete! 🎉</span>
        ) : target > 0 ? (
          <span className="text-sm font-medium text-muted-foreground">{progress.toFixed(0)}%</span>
        ) : null}
      </div>
    </div>
  );
}

export function GoalsPanel({
  results,
  cycle,
  cycleTarget,
  onUpdateCycleTarget,
}: GoalsPanelProps) {
  const { triggerGoalComplete } = useConfetti();
  
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
  const cycleGoalKey = `cycle-${cycleKey}`;

  return (
    <GoalRow
      label="Cycle"
      current={cycleTotal}
      target={cycleTarget}
      goalKey={cycleGoalKey}
      onUpdateTarget={(target) => onUpdateCycleTarget(target, cycleKey)}
      onGoalComplete={triggerGoalComplete}
    />
  );
}
