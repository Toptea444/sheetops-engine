import { useState, useEffect, useRef } from 'react';
import { Edit3, Check, X, CheckCircle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { useConfetti } from '@/hooks/useConfetti';
import type { BonusResult } from '@/types/bonus';
import type { CyclePeriod } from '@/lib/cycleUtils';
import { isDateInCycle, getCycleKey } from '@/lib/cycleUtils';

interface GoalsPanelProps {
  results: BonusResult[];
  cycle: CyclePeriod;
  dailyTarget: number;
  cycleTarget: number;
  onUpdateDailyTarget: (target: number) => void;
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
    <div className={`space-y-2.5 p-3 rounded-lg border transition-all duration-300 ${
      showCelebration 
        ? 'bg-success/10 border-success/40 ring-2 ring-success/20' 
        : isComplete 
          ? 'bg-success/5 border-success/30' 
          : 'bg-muted/20 border-border/60'
    }`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium flex items-center gap-1.5">
          {label}
          {showCelebration && <Sparkles className="h-4 w-4 text-success animate-pulse" />}
        </span>
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
            className="h-8 text-sm gap-1 text-muted-foreground"
            onClick={() => {
              setInputValue(target.toString());
              setIsEditing(true);
            }}
          >
            {target > 0 ? `₦${target.toLocaleString()}` : 'Set'}
            <Edit3 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
      <Progress value={progress} className={`h-1.5 ${isComplete ? '[&>div]:bg-success' : ''}`} />
      <div className="flex justify-between items-center text-sm">
        <span className="font-medium">₦{current.toLocaleString()}</span>
        {isComplete ? (
          <span className="flex items-center gap-1 text-success text-sm">
            <CheckCircle className="h-4 w-4" />
            Done
          </span>
        ) : target > 0 ? (
          <span className="text-muted-foreground text-sm">{progress.toFixed(0)}%</span>
        ) : null}
      </div>
    </div>
  );
}

export function GoalsPanel({
  results,
  cycle,
  dailyTarget,
  cycleTarget,
  onUpdateDailyTarget,
  onUpdateCycleTarget,
}: GoalsPanelProps) {
  const { triggerGoalComplete } = useConfetti();
  
  let cycleTotal = 0;
  let todayTotal = 0;
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();

  results.forEach((result) => {
    if (result.valueType === 'percent') return;

    result.dailyBreakdown?.forEach((day) => {
      if (day.fullDate === undefined) return;
      const dayDate = new Date(day.fullDate);
      if (isDateInCycle(dayDate, cycle)) {
        cycleTotal += day.value;
        const dayStart = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate()).getTime();
        if (dayStart === todayStart) {
          todayTotal += day.value;
        }
      }
    });
  });

  const cycleKey = getCycleKey(cycle);
  const dailyGoalKey = `daily-${new Date().toDateString()}`;
  const cycleGoalKey = `cycle-${cycleKey}`;

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Goals</p>
      <div className="space-y-3">
        <GoalRow
          label="Daily"
          current={todayTotal}
          target={dailyTarget}
          goalKey={dailyGoalKey}
          onUpdateTarget={onUpdateDailyTarget}
          onGoalComplete={triggerGoalComplete}
        />
        <GoalRow
          label="Cycle"
          current={cycleTotal}
          target={cycleTarget}
          goalKey={cycleGoalKey}
          onUpdateTarget={(target) => onUpdateCycleTarget(target, cycleKey)}
          onGoalComplete={triggerGoalComplete}
        />
      </div>
    </div>
  );
}
