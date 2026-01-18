import { useState } from 'react';
import { Target, Edit3, Check, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import type { BonusResult } from '@/types/bonus';
import type { CyclePeriod } from '@/lib/cycleUtils';
import { isDateInCycle } from '@/lib/cycleUtils';

interface GoalsPanelProps {
  results: BonusResult[];
  cycle: CyclePeriod;
  dailyTarget: number;
  cycleTarget: number;
  onUpdateDailyTarget: (target: number) => void;
  onUpdateCycleTarget: (target: number) => void;
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

  const handleCancel = () => {
    setInputValue(target.toString());
    setIsEditing(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        {isEditing ? (
          <div className="flex items-center gap-1">
            <Input
              type="number"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="h-7 w-24 text-sm"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
                if (e.key === 'Escape') handleCancel();
              }}
            />
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleSave}>
              <Check className="h-3 w-3" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleCancel}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-muted-foreground hover:text-foreground"
            onClick={() => {
              setInputValue(target.toString());
              setIsEditing(true);
            }}
          >
            <span>{target > 0 ? `₦${target.toLocaleString()}` : 'Set target'}</span>
            <Edit3 className="h-3 w-3" />
          </Button>
        )}
      </div>
      <div className="space-y-1">
        <Progress value={progress} className={`h-2 ${isComplete ? '[&>div]:bg-success' : ''}`} />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>₦{current.toLocaleString()}</span>
          <span>
            {isComplete ? (
              <span className="text-success font-medium">🎉 Target reached!</span>
            ) : target > 0 ? (
              `${progress.toFixed(0)}%`
            ) : (
              ''
            )}
          </span>
        </div>
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
  // Calculate current cycle earnings
  let cycleTotal = 0;
  let todayTotal = 0;
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();

  results.forEach((result) => {
    result.dailyBreakdown?.forEach((day) => {
      if (day.fullDate === undefined) return;

      const dayDate = new Date(day.fullDate);
      if (isDateInCycle(dayDate, cycle)) {
        cycleTotal += day.value;
        
        // Check if this is today
        const dayStart = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate()).getTime();
        if (dayStart === todayStart) {
          todayTotal += day.value;
        }
      }
    });
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Target className="h-5 w-5" />
          Goals
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <GoalRow
          label="Daily Target"
          current={todayTotal}
          target={dailyTarget}
          onUpdateTarget={onUpdateDailyTarget}
        />
        <GoalRow
          label="Cycle Target"
          current={cycleTotal}
          target={cycleTarget}
          onUpdateTarget={onUpdateCycleTarget}
        />
      </CardContent>
    </Card>
  );
}
