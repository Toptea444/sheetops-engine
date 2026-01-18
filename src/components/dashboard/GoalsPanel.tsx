import { useState } from 'react';
import { Target, Edit2, Check, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import type { BonusResult } from '@/types/bonus';

interface GoalsPanelProps {
  results: BonusResult[];
  dailyTarget: number;
  weeklyTarget: number;
  onUpdateDailyTarget: (target: number) => void;
  onUpdateWeeklyTarget: (target: number) => void;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

interface GoalRowProps {
  label: string;
  current: number;
  target: number;
  isEditing: boolean;
  editValue: string;
  onEditStart: () => void;
  onEditChange: (value: string) => void;
  onEditSave: () => void;
  onEditCancel: () => void;
}

function GoalRow({
  label,
  current,
  target,
  isEditing,
  editValue,
  onEditStart,
  onEditChange,
  onEditSave,
  onEditCancel,
}: GoalRowProps) {
  const progress = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  const isComplete = current >= target && target > 0;

  return (
    <div className="space-y-2 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        {isEditing ? (
          <div className="flex items-center gap-1">
            <Input
              type="number"
              value={editValue}
              onChange={(e) => onEditChange(e.target.value)}
              className="h-8 w-24 text-right"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') onEditSave();
                if (e.key === 'Escape') onEditCancel();
              }}
            />
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onEditSave}>
              <Check className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onEditCancel}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            className="h-8 gap-1 text-xs"
            onClick={onEditStart}
          >
            <Edit2 className="h-3 w-3" />
            {target > 0 ? formatCurrency(target) : 'Set target'}
          </Button>
        )}
      </div>

      {target > 0 && (
        <>
          <div className="flex items-center justify-between text-sm">
            <span className={isComplete ? 'text-green-600 dark:text-green-400 font-medium' : ''}>
              {formatCurrency(current)}
            </span>
            <span className="text-muted-foreground">
              {progress.toFixed(0)}%
            </span>
          </div>
          <Progress 
            value={progress} 
            className={`h-2 ${isComplete ? '[&>div]:bg-green-500' : ''}`}
          />
          {isComplete && (
            <p className="text-xs text-green-600 dark:text-green-400 font-medium">
              🎉 Goal achieved!
            </p>
          )}
        </>
      )}

      {target === 0 && (
        <p className="text-xs text-muted-foreground">
          Set a target to track your progress
        </p>
      )}
    </div>
  );
}

export function GoalsPanel({
  results,
  dailyTarget,
  weeklyTarget,
  onUpdateDailyTarget,
  onUpdateWeeklyTarget,
}: GoalsPanelProps) {
  const [editingDaily, setEditingDaily] = useState(false);
  const [editingWeekly, setEditingWeekly] = useState(false);
  const [dailyEditValue, setDailyEditValue] = useState(dailyTarget.toString());
  const [weeklyEditValue, setWeeklyEditValue] = useState(weeklyTarget.toString());

  // Calculate current values
  const allDays = results.flatMap(r => r.dailyBreakdown);
  const sortedDays = allDays
    .filter(d => d.fullDate !== undefined)
    .sort((a, b) => (b.fullDate ?? 0) - (a.fullDate ?? 0));

  // Today's earnings (most recent day)
  const todayEarnings = sortedDays.length > 0 ? sortedDays[0].value : 0;

  // This week's earnings (last 7 days)
  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const weeklyEarnings = sortedDays
    .filter(d => (d.fullDate ?? 0) >= weekAgo)
    .reduce((sum, d) => sum + d.value, 0);

  const handleDailyEditStart = () => {
    setDailyEditValue(dailyTarget.toString());
    setEditingDaily(true);
  };

  const handleDailySave = () => {
    const value = parseFloat(dailyEditValue) || 0;
    onUpdateDailyTarget(value);
    setEditingDaily(false);
  };

  const handleWeeklyEditStart = () => {
    setWeeklyEditValue(weeklyTarget.toString());
    setEditingWeekly(true);
  };

  const handleWeeklySave = () => {
    const value = parseFloat(weeklyEditValue) || 0;
    onUpdateWeeklyTarget(value);
    setEditingWeekly(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Goals & Targets
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <GoalRow
          label="Daily Target"
          current={todayEarnings}
          target={dailyTarget}
          isEditing={editingDaily}
          editValue={dailyEditValue}
          onEditStart={handleDailyEditStart}
          onEditChange={setDailyEditValue}
          onEditSave={handleDailySave}
          onEditCancel={() => setEditingDaily(false)}
        />
        <GoalRow
          label="Weekly Target"
          current={weeklyEarnings}
          target={weeklyTarget}
          isEditing={editingWeekly}
          editValue={weeklyEditValue}
          onEditStart={handleWeeklyEditStart}
          onEditChange={setWeeklyEditValue}
          onEditSave={handleWeeklySave}
          onEditCancel={() => setEditingWeekly(false)}
        />
      </CardContent>
    </Card>
  );
}
