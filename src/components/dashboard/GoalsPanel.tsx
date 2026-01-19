import { useState } from 'react';
import { Edit3, Check, X, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
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
  onUpdateTarget: (target: number) => void;
}

function GoalRow({ label, current, target, onUpdateTarget }: GoalRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(target.toString());

  const progress = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  const isComplete = current >= target && target > 0;

  const handleSave = () => {
    const parsed = parseFloat(inputValue);
    if (!isNaN(parsed) && parsed >= 0) {
      onUpdateTarget(parsed);
    }
    setIsEditing(false);
  };

  return (
    <div className="space-y-2 p-3 rounded-md bg-muted/30 border border-border/50">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium">{label}</span>
        {isEditing ? (
          <div className="flex items-center gap-1">
            <Input
              type="number"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="h-6 w-20 text-xs px-2"
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
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs gap-1 text-muted-foreground"
            onClick={() => {
              setInputValue(target.toString());
              setIsEditing(true);
            }}
          >
            {target > 0 ? `₦${target.toLocaleString()}` : 'Set'}
            <Edit3 className="h-2.5 w-2.5" />
          </Button>
        )}
      </div>
      <Progress value={progress} className={`h-1.5 ${isComplete ? '[&>div]:bg-success' : ''}`} />
      <div className="flex justify-between items-center text-xs">
        <span className="font-medium">₦{current.toLocaleString()}</span>
        {isComplete ? (
          <span className="flex items-center gap-1 text-success text-[11px]">
            <CheckCircle className="h-3 w-3" />
            Done
          </span>
        ) : target > 0 ? (
          <span className="text-muted-foreground text-[11px]">{progress.toFixed(0)}%</span>
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

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">Goals</p>
      <div className="space-y-2">
        <GoalRow
          label="Daily"
          current={todayTotal}
          target={dailyTarget}
          onUpdateTarget={onUpdateDailyTarget}
        />
        <GoalRow
          label="Cycle"
          current={cycleTotal}
          target={cycleTarget}
          onUpdateTarget={(target) => onUpdateCycleTarget(target, cycleKey)}
        />
      </div>
    </div>
  );
}
